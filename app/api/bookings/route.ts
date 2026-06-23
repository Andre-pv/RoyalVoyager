import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ─── GET: Fetch bookings ───────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch fresh user to avoid stale session ID issues
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const bookingId = url.searchParams.get('id');
    const isAll = url.searchParams.get('all') === 'true';
    const isAdmin = dbUser.role === 'admin';

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          cruise: true,
          roomBookings: { include: { room: true } },
          restaurantBookings: { include: { restaurant: true } },
          showBookings: { include: { show: true } },
          gameBookings: { include: { game: true } },
        },
      });
      
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      if (!isAdmin && booking.userId !== dbUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      return NextResponse.json({ success: true, booking });
    }

    const where = isAll && isAdmin ? {} : { userId: dbUser.id };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        cruise: { select: { id: true, name: true, source: true, destination: true, date: true, endDate: true, duration: true } },
        roomBookings: { include: { room: { select: { type: true, deckNumber: true } } } },
        restaurantBookings: { include: { restaurant: { select: { mealType: true, slotTime: true, slotDate: true } } } },
        showBookings: { include: { show: { select: { name: true, time: true, showDate: true } } } },
        gameBookings: { include: { game: { select: { name: true, time: true, gameDate: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Create a new booking ──────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch the latest user ID from DB using email. 
    // This correctly handles cases where the DB was reset but the JWT token is stale.
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: 'Invalid user session. Please log out and back in.' }, { status: 401 });
    }
    const userId = dbUser.id;

    const body = await req.json();
    const {
      cruiseId,
      rooms = [], // Expected: { roomId, roomNumber }[]
      restaurantIds = [],
      totalPrice,
      guestCount,
    } = body;

    if (!cruiseId || !rooms.length || !totalPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the core Booking first (without room info yet)
      const booking = await tx.booking.create({
        data: {
          userId,
          cruiseId,
          totalPrice,
          status: 'confirmed',
          notes: guestCount ? `Guests: ${guestCount}` : null,
        },
        include: { cruise: true, user: true },
      });

      // 2. Process each room
      for (const r of rooms) {
        const room = await tx.room.findUnique({ where: { id: r.roomId } });
        if (!room) throw new Error(`Room category ${r.roomId} not found`);
        if (room.availableRooms < 1) throw new Error(`No rooms available in ${room.type} category.`);

        // Decrement availability
        await tx.room.update({
          where: { id: r.roomId },
          data: { availableRooms: { decrement: 1 } },
        });

        // Create the RoomBooking record
        await tx.roomBooking.create({
          data: {
            bookingId: booking.id,
            roomId: r.roomId,
            quantity: 1, // One specific cabin per entry
          },
        });
      }

      // Update the main booking with all room numbers combined
      const combinedRoomNumbers = rooms.map((rm: any) => rm.roomNumber).filter(Boolean).join(', ');
      await tx.booking.update({
         where: { id: booking.id },
         data: { roomNumber: combinedRoomNumbers }
      });


      // 3. Book restaurants
      const paxCount = rooms.length * 3; // Theoretical capacity, but we can use real guest count if passed
      // For simplicity, let's assume quantity is 1 per room or just use a default
      for (const rId of restaurantIds) {
        const rest = await tx.restaurant.findUnique({ where: { id: rId } });
        if (!rest) continue;

        if (rest.bookedCount + 1 <= rest.capacity) {
          await tx.restaurantBooking.create({
            data: { bookingId: booking.id, restaurantId: rId, guestCount: 1 },
          });
          await tx.restaurant.update({
            where: { id: rId },
            data: { bookedCount: { increment: 1 } },
          });
        } else {
          // Waitlist
          await tx.waitlist.create({
            data: { userId, eventType: 'restaurant', restaurantId: rId, position: 1 },
          });
        }
      }
      return booking;
    });

    return NextResponse.json({
      success: true,
      bookingId: result.id,
      message: 'Booking confirmed!',
    });
  } catch (error: any) {
    console.error('[POST /api/bookings] Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Booking failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Cancel a booking ─────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { bookingId, status } = await req.json();
    const isAdmin = dbUser.role === 'admin';
    const userId = dbUser.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        roomBookings: true,
        restaurantBookings: true,
        showBookings: true,
        gameBookings: true
      },
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Only owner or admin can modify
    if (!isAdmin && booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update booking status
      await tx.booking.update({ where: { id: bookingId }, data: { status } });

      if (status === 'cancelled' && booking.status === 'confirmed') {
        // 2. Restore room availability
        for (const rb of booking.roomBookings) {
          await tx.room.update({
            where: { id: rb.roomId },
            data: { availableRooms: { increment: rb.quantity } },
          });
        }

        // 3. Restore Restaurant capacity
        for (const rb of booking.restaurantBookings) {
          await tx.restaurant.update({
            where: { id: rb.restaurantId },
            data: { bookedCount: { decrement: rb.guestCount } },
          });
        }

        // 4. Restore Show capacity
        for (const sb of booking.showBookings) {
          await tx.show.update({
            where: { id: sb.showId },
            data: { bookedCount: { decrement: 1 } },
          });
        }

        // 5. Restore Game capacity
        for (const gb of booking.gameBookings) {
          await tx.game.update({
            where: { id: gb.gameId },
            data: { currentPlayers: { decrement: 1 } },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
