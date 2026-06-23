import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Generates a deterministic list of room slots for a deck
// Occupied rooms = totalRooms - availableRooms (distributed from start)
function generateRoomSlots(
  totalRooms: number,
  availableRooms: number,
  deckNumber: number,
  startIndex = 1
) {
  const occupiedCount = totalRooms - availableRooms;
  return Array.from({ length: totalRooms }, (_, i) => {
    const roomNum = `${deckNumber}${String(200 + startIndex + i).slice(-3)}`;
    return {
      number: roomNum,
      status: i < occupiedCount ? 'occupied' : 'available',
    };
  });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const rooms = await prisma.room.findMany({
      where: { cruiseId: params.id },
      orderBy: { deckNumber: 'asc' },
    });

    if (!rooms.length) {
      return NextResponse.json({ error: 'No rooms found for this cruise' }, { status: 404 });
    }

    const decks = rooms.map((room) => ({
      id: room.id,
      type: room.type,
      deckNumber: room.deckNumber,
      price: room.price,
      totalRooms: room.totalRooms,
      availableRooms: room.availableRooms,
      slots: generateRoomSlots(room.totalRooms, room.availableRooms, room.deckNumber),
    }));

    return NextResponse.json({ decks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
