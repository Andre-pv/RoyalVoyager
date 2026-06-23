import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const cruise = await prisma.cruise.findUnique({
      where: { id: params.id },
      include: {
        rooms: { orderBy: { deckNumber: 'asc' } },
        restaurants: { orderBy: { slotDate: 'asc' } },
        shows: { orderBy: { showDate: 'asc' } },
        games: { orderBy: { gameDate: 'asc' } },
        region: true,
      },
    });

    if (!cruise) {
      return NextResponse.json({ error: 'Cruise not found' }, { status: 404 });
    }

    return NextResponse.json({ cruise });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
