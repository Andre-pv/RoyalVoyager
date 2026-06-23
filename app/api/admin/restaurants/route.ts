import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

// GET: All dining slots with guests
export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const restaurants = await prisma.restaurant.findMany({
      include: {
        cruise: { select: { name: true } },
        bookings: {
          include: {
            booking: {
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
      orderBy: { slotDate: 'asc' },
    });

    return NextResponse.json({ restaurants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a dining slot
export async function POST(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { cruiseId, mealType, slotTime, slotDate, capacity, durationMinutes } = body;

    const restaurant = await prisma.restaurant.create({
      data: {
        cruiseId,
        mealType,
        slotTime,
        slotDate: new Date(slotDate),
        capacity: Number(capacity) || 100,
        durationMinutes: Number(durationMinutes) || 90,
      },
    });

    return NextResponse.json({ success: true, restaurant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Add a guest to a dining slot (requires a booking)
export async function PATCH(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { restaurantId, bookingId, guestCount } = await req.json();

    await prisma.$transaction(async (tx) => {
      const rest = await tx.restaurant.findUnique({ where: { id: restaurantId } });
      if (!rest) throw new Error('Restaurant slot not found');
      if (rest.bookedCount + (guestCount || 1) > rest.capacity) throw new Error('Slot is at full capacity');

      await tx.restaurantBooking.create({
        data: { restaurantId, bookingId, guestCount: guestCount || 1 },
      });
      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { bookedCount: { increment: guestCount || 1 } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
