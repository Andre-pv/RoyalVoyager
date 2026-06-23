import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

// GET: All bookings for admin
export async function GET(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        cruise: { select: { name: true, source: true, destination: true, date: true } },
        roomBookings: { include: { room: { select: { type: true, deckNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update booking status
export async function PATCH(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { bookingId, status } = await req.json();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { roomBookings: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status } });

      // Restore room on cancel
      if (status === 'cancelled' && booking.status === 'confirmed') {
        for (const rb of booking.roomBookings) {
          await tx.room.update({
            where: { id: rb.roomId },
            data: { availableRooms: { increment: rb.quantity } },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
