'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type BookingResult = {
  success: boolean;
  status?: 'confirmed' | 'waitlisted' | 'error';
  message: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const timeToMinutes = (timeStr: string) => {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// Detect time/date conflicts for a given user
export const checkActivityOverlap = async (
  userId: string,
  targetDate: Date,
  newStartStr: string,
  durationMinutes: number
): Promise<{ overlap: boolean; message?: string }> => {
  const newStart = timeToMinutes(newStartStr);
  const newEnd = newStart + durationMinutes;

  // We should fetch same-day event bookings for the user to check overlap.
  // Assuming targetDate is just the date without time for simplicity.
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

  // Check Shows
  const shows = await prisma.showBooking.findMany({
    where: { userId, show: { showDate: { gte: startOfDay, lte: endOfDay } } },
    include: { show: true },
  });

  for (const booking of shows) {
    const existingStart = timeToMinutes(booking.show.time);
    const existingEnd = existingStart + booking.show.durationMinutes;
    if (newStart < existingEnd && existingStart < newEnd) {
      return { overlap: true, message: `Overlaps with your existing show: ${booking.show.name}` };
    }
  }

  // Check Games
  const games = await prisma.gameBooking.findMany({
    where: { userId, game: { gameDate: { gte: startOfDay, lte: endOfDay } } },
    include: { game: true },
  });

  for (const booking of games) {
    const existingStart = timeToMinutes(booking.game.time);
    const existingEnd = existingStart + booking.game.durationMinutes;
    if (newStart < existingEnd && existingStart < newEnd) {
      return { overlap: true, message: `Overlaps with your existing game: ${booking.game.name}` };
    }
  }

  // Check Restaurants
  const restaurants = await prisma.restaurantBooking.findMany({
    where: { booking: { userId }, restaurant: { slotDate: { gte: startOfDay, lte: endOfDay } } },
    include: { restaurant: true },
  });
  
  for (const rBooking of restaurants) {
    const existingStart = timeToMinutes(rBooking.restaurant.slotTime);
    const existingEnd = existingStart + rBooking.restaurant.durationMinutes;
    if (newStart < existingEnd && existingStart < newEnd) {
      return { overlap: true, message: `Overlaps with a restaurant reservation` };
    }
  }

  return { overlap: false };
};


// ─── Actions ───────────────────────────────────────────────────────────────

export async function bookShowTransaction(userId: string, showId: string): Promise<BookingResult> {
  if (!userId || !showId) return { success: false, status: 'error', message: 'Invalid request' };

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Show and lock row
      const show = await tx.show.findUnique({
        where: { id: showId },
      });

      if (!show) throw new Error('Show not found');

      // 2. Check Overlap
      const { overlap, message } = await checkActivityOverlap(userId, show.showDate, show.time, show.durationMinutes);
      if (overlap) {
        return { success: false, status: 'error', message: message || 'Time conflict detected.' };
      }

      // 3. Check Idempotency / Duplicate
      const existing = await tx.showBooking.findUnique({
        where: { showId_userId: { showId, userId } }
      });
      if (existing) {
        return { success: true, status: 'confirmed', message: 'You have already booked this show.' };
      }

      const existingWaitlist = await tx.waitlist.findFirst({
        where: { userId, showId, eventType: 'show' }
      });
      if (existingWaitlist) {
        return { success: true, status: 'waitlisted', message: 'You are already on the waitlist for this show.' };
      }

      // 4. Capacity Check
      if (show.bookedCount >= show.capacity) {
        const lastInLine = await tx.waitlist.findFirst({
          where: { showId, eventType: 'show' },
          orderBy: { position: 'desc' }
        });
        const position = lastInLine ? lastInLine.position + 1 : 1;

        await tx.waitlist.create({
          data: { userId, eventType: 'show', showId, position }
        });

        return { success: true, status: 'waitlisted', message: `Full! Added to waitlist at position ${position}.` };
      }

      // 5. Book
      await tx.showBooking.create({
        data: { userId, showId }
      });

      await tx.show.update({
        where: { id: showId },
        data: { bookedCount: { increment: 1 } }
      });

      return { success: true, status: 'confirmed', message: 'Show booking confirmed!' };
    });
  } catch (error) {
    console.error('Booking attempt error:', { userId, showId, error });
    return { success: false, status: 'error', message: 'An unexpected error occurred.' };
  }
}

export async function bookGameTransaction(userId: string, gameId: string): Promise<BookingResult> {
  if (!userId || !gameId) return { success: false, status: 'error', message: 'Invalid request' };

  try {
    return await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new Error('Game not found');

      const { overlap, message } = await checkActivityOverlap(userId, game.gameDate, game.time, game.durationMinutes);
      if (overlap) return { success: false, status: 'error', message: message || 'Time conflict detected.' };

      const existing = await tx.gameBooking.findUnique({
        where: { gameId_userId: { gameId, userId } }
      });
      if (existing) return { success: true, status: 'confirmed', message: 'You have already booked this game.' };

      const existingWaitlist = await tx.waitlist.findFirst({
        where: { userId, gameId, eventType: 'game' }
      });
      if (existingWaitlist) return { success: true, status: 'waitlisted', message: 'You are already on the waitlist.' };

      if (game.currentPlayers >= game.maxPlayers) {
        const lastInLine = await tx.waitlist.findFirst({
          where: { gameId, eventType: 'game' },
          orderBy: { position: 'desc' }
        });
        const position = lastInLine ? lastInLine.position + 1 : 1;
        await tx.waitlist.create({ data: { userId, eventType: 'game', gameId, position } });
        return { success: true, status: 'waitlisted', message: `Full! Added to waitlist at position ${position}.` };
      }

      await tx.gameBooking.create({ data: { userId, gameId } });
      await tx.game.update({ where: { id: gameId }, data: { currentPlayers: { increment: 1 } } });

      return { success: true, status: 'confirmed', message: 'Game booking confirmed!' };
    });
  } catch (error) {
    console.error('Booking attempt error:', { userId, gameId, error });
    return { success: false, status: 'error', message: 'An unexpected error occurred.' };
  }
}

export async function cancelBookingTransaction(userId: string, eventId: string, type: 'show' | 'game'): Promise<BookingResult> {
  if (!userId || !eventId) return { success: false, status: 'error', message: 'Invalid request' };

  try {
    return await prisma.$transaction(async (tx) => {
      if (type === 'show') {
        const existing = await tx.showBooking.findUnique({
          where: { showId_userId: { showId: eventId, userId } }
        });
        if (!existing) return { success: false, status: 'error', message: 'Booking not found.' };

        // Delete booking
        await tx.showBooking.delete({ where: { id: existing.id } });
        await tx.show.update({ where: { id: eventId }, data: { bookedCount: { decrement: 1 } } });

        // Waitlist Promotion
        const nextInLine = await tx.waitlist.findFirst({
          where: { showId: eventId, eventType: 'show' },
          orderBy: { position: 'asc' }
        });

        if (nextInLine) {
          // Auto-book them
          await tx.showBooking.create({ data: { userId: nextInLine.userId, showId: eventId } });
          await tx.show.update({ where: { id: eventId }, data: { bookedCount: { increment: 1 } } });
          // Remove from waitlist
          await tx.waitlist.delete({ where: { id: nextInLine.id } });
          // Shift positions
          await tx.waitlist.updateMany({
            where: { showId: eventId, eventType: 'show', position: { gt: nextInLine.position } },
            data: { position: { decrement: 1 } }
          });
        }
      } else if (type === 'game') {
        const existing = await tx.gameBooking.findUnique({
          where: { gameId_userId: { gameId: eventId, userId } }
        });
        if (!existing) return { success: false, status: 'error', message: 'Booking not found.' };

        await tx.gameBooking.delete({ where: { id: existing.id } });
        await tx.game.update({ where: { id: eventId }, data: { currentPlayers: { decrement: 1 } } });

        const nextInLine = await tx.waitlist.findFirst({
          where: { gameId: eventId, eventType: 'game' },
          orderBy: { position: 'asc' }
        });

        if (nextInLine) {
          await tx.gameBooking.create({ data: { userId: nextInLine.userId, gameId: eventId } });
          await tx.game.update({ where: { id: eventId }, data: { currentPlayers: { increment: 1 } } });
          await tx.waitlist.delete({ where: { id: nextInLine.id } });
          await tx.waitlist.updateMany({
            where: { gameId: eventId, eventType: 'game', position: { gt: nextInLine.position } },
            data: { position: { decrement: 1 } }
          });
        }
      }

      return { success: true, message: 'Successfully canceled booking.' };
    });
  } catch (error) {
    console.error('Cancellation error:', { userId, eventId, error });
    return { success: false, status: 'error', message: 'An unexpected error occurred.' };
  }
}

export async function bookRestaurantTransaction(userId: string, restaurantId: string): Promise<BookingResult> {
  if (!userId || !restaurantId) return { success: false, status: 'error', message: 'Invalid request' };

  try {
    return await prisma.$transaction(async (tx) => {
      const rest = await tx.restaurant.findUnique({ where: { id: restaurantId } });
      if (!rest) throw new Error('Restaurant not found');

      const { overlap, message } = await checkActivityOverlap(userId, rest.slotDate, rest.slotTime, rest.durationMinutes);
      if (overlap) return { success: false, status: 'error', message: message || 'Time conflict detected.' };

      const existingWaitlist = await tx.waitlist.findFirst({
        where: { userId, restaurantId, eventType: 'restaurant' }
      });
      if (existingWaitlist) return { success: true, status: 'waitlisted', message: 'You are already on the waitlist.' };

      if (rest.bookedCount >= rest.capacity) {
        const lastInLine = await tx.waitlist.findFirst({
          where: { restaurantId, eventType: 'restaurant' },
          orderBy: { position: 'desc' }
        });
        const position = lastInLine ? lastInLine.position + 1 : 1;
        await tx.waitlist.create({ data: { userId, eventType: 'restaurant', restaurantId, position } });
        return { success: true, status: 'waitlisted', message: `Full! Added to waitlist at position ${position}.` };
      }

      await tx.restaurant.update({ where: { id: restaurantId }, data: { bookedCount: { increment: 1 } } });
      return { success: true, status: 'confirmed', message: 'Restaurant booking confirmed!' };
    });
  } catch (error) {
    console.error('Restaurant booking attempt error:', { userId, restaurantId, error });
    return { success: false, status: 'error', message: 'An unexpected error occurred.' };
  }
}
