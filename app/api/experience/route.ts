import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ─── Helper: time string → minutes since midnight ─────────────────────────────
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// ─── Helper: overlap check ───────────────────────────────────────────────────
const overlaps = (s1: number, d1: number, s2: number, d2: number) =>
  s1 < s2 + d2 && s2 < s1 + d1;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = dbUser.id;

    const { bookingId, showIds = [], gameIds = [], restaurantIds = [] } = await req.json();

    // Verify booking ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId },
      include: { cruise: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const confirmed: { shows: string[]; games: string[]; restaurants: string[] } = { shows: [], games: [], restaurants: [] };
    const waitlisted: { shows: string[]; games: string[]; restaurants: string[] } = { shows: [], games: [], restaurants: [] };
    const errors: string[] = [];

    // ── Process Shows ─────────────────────────────────────────────────────────
    for (const showId of showIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const show = await tx.show.findUnique({ where: { id: showId } });
          if (!show) throw new Error('Show not found');

          // Check time hasn't passed
          const now = new Date();
          const eventDT = new Date(`${show.showDate.toISOString().split('T')[0]}T${show.time}`);
          if (eventDT < now) throw new Error(`"${show.name}" has already started.`);

          // Duplicate check
          const dupe = await tx.showBooking.findUnique({
            where: { showId_userId: { showId, userId } },
          });
          if (dupe) { confirmed.shows.push(showId); return; }

          // Waitlist duplicate
          const waitDupe = await tx.waitlist.findFirst({ where: { userId, showId, eventType: 'show' } });
          if (waitDupe) { waitlisted.shows.push(showId); return; }

          if (show.bookedCount < show.capacity) {
            await tx.showBooking.create({ data: { showId, userId, bookingId } });
            await tx.show.update({ where: { id: showId }, data: { bookedCount: { increment: 1 } } });
            confirmed.shows.push(showId);
          } else {
            const last = await tx.waitlist.findFirst({ where: { showId, eventType: 'show' }, orderBy: { position: 'desc' } });
            await tx.waitlist.create({ data: { userId, eventType: 'show', showId, position: (last?.position ?? 0) + 1 } });
            waitlisted.shows.push(showId);
          }
        });
      } catch (err: any) {
        if (err.code === 'P2002') { confirmed.shows.push(showId); }
        else { errors.push(err.message); }
      }
    }

    // ── Process Games ─────────────────────────────────────────────────────────
    for (const gameId of gameIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const game = await tx.game.findUnique({ where: { id: gameId } });
          if (!game) throw new Error('Game not found');

          const now = new Date();
          const eventDT = new Date(`${game.gameDate.toISOString().split('T')[0]}T${game.time}`);
          if (eventDT < now) throw new Error(`"${game.name}" has already started.`);

          const dupe = await tx.gameBooking.findUnique({
            where: { gameId_userId: { gameId, userId } },
          });
          if (dupe) { confirmed.games.push(gameId); return; }

          const waitDupe = await tx.waitlist.findFirst({ where: { userId, gameId, eventType: 'game' } });
          if (waitDupe) { waitlisted.games.push(gameId); return; }

          if (game.currentPlayers < game.maxPlayers) {
            await tx.gameBooking.create({ data: { gameId, userId, bookingId } });
            await tx.game.update({ where: { id: gameId }, data: { currentPlayers: { increment: 1 } } });
            confirmed.games.push(gameId);
          } else {
            const last = await tx.waitlist.findFirst({ where: { gameId, eventType: 'game' }, orderBy: { position: 'desc' } });
            await tx.waitlist.create({ data: { userId, eventType: 'game', gameId, position: (last?.position ?? 0) + 1 } });
            waitlisted.games.push(gameId);
          }
        });
      } catch (err: any) {
        if (err.code === 'P2002') { confirmed.games.push(gameId); }
        else { errors.push(err.message); }
      }
    }

    // ── Process Restaurants ───────────────────────────────────────────────────
    for (const restaurantId of restaurantIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId } });
          if (!restaurant) throw new Error('Restaurant not found');

          const now = new Date();
          const eventDT = new Date(`${restaurant.slotDate.toISOString().split('T')[0]}T${restaurant.slotTime}`);
          if (eventDT < now) throw new Error(`"${restaurant.name}" slot has already passed.`);

          // Cannot do a simple unique constraint wait catch for guest count, check manually
          const dupe = await tx.restaurantBooking.findFirst({
            where: { bookingId, restaurantId },
          });
          if (dupe) { confirmed.restaurants.push(restaurantId); return; }

          const waitDupe = await tx.waitlist.findFirst({ where: { userId, restaurantId, eventType: 'restaurant' } });
          if (waitDupe) { waitlisted.restaurants.push(restaurantId); return; }

          if (restaurant.bookedCount < restaurant.capacity) {
            await tx.restaurantBooking.create({ data: { restaurantId, bookingId, guestCount: 1 } });
            await tx.restaurant.update({ where: { id: restaurantId }, data: { bookedCount: { increment: 1 } } });
            confirmed.restaurants.push(restaurantId);
          } else {
            const last = await tx.waitlist.findFirst({ where: { restaurantId, eventType: 'restaurant' }, orderBy: { position: 'desc' } });
            await tx.waitlist.create({ data: { userId, eventType: 'restaurant', restaurantId, position: (last?.position ?? 0) + 1 } });
            waitlisted.restaurants.push(restaurantId);
          }
        });
      } catch (err: any) {
        if (err.code === 'P2002') { confirmed.restaurants.push(restaurantId); }
        else { errors.push(err.message); }
      }
    }

    return NextResponse.json({ confirmed, waitlisted, errors });
  } catch (error: any) {
    console.error('[POST /api/experience]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
