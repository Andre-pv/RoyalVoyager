import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

// GET: All waitlist entries
export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const entries = await prisma.waitlist.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        show: { select: { name: true, time: true, showDate: true } },
        game: { select: { name: true, time: true, gameDate: true } },
        restaurant: { select: { mealType: true, slotTime: true, slotDate: true } },
      },
      orderBy: [{ eventType: 'asc' }, { position: 'asc' }],
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a waitlist entry (with position reordering)
export async function DELETE(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { waitlistId } = await req.json();

    const entry = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.waitlist.delete({ where: { id: waitlistId } });

      // Reorder remaining positions
      const filter: any = {
        eventType: entry.eventType,
        position: { gt: entry.position },
      };
      if (entry.showId) filter.showId = entry.showId;
      if (entry.gameId) filter.gameId = entry.gameId;
      if (entry.restaurantId) filter.restaurantId = entry.restaurantId;

      await tx.waitlist.updateMany({
        where: filter,
        data: { position: { decrement: 1 } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
