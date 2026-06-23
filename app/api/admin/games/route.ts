import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

export async function GET(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const search = searchParams.get('search')?.trim() ?? '';
    const sort   = searchParams.get('sort')  ?? 'gameDate';
    const order  = searchParams.get('order') === 'desc' ? 'desc' : 'asc';
    const skip   = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { cruise: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    } : {};

    const orderBy: any = sort === 'cruise' ? { cruise: { name: order } } : { [sort]: order };

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        include: {
          cruise: { select: { name: true } },
          bookings: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.game.count({ where }),
    ]);

    return NextResponse.json({ games, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { cruiseId, name, gameDate, time, durationMinutes, maxPlayers } = await req.json();
    const game = await prisma.game.create({
      data: { cruiseId, name, gameDate: new Date(gameDate), time, durationMinutes: Number(durationMinutes) || 60, maxPlayers: Number(maxPlayers) || 30 },
    });
    return NextResponse.json({ success: true, game });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { gameId, userId } = await req.json();
    await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new Error('Game not found');
      if (game.currentPlayers >= game.maxPlayers) throw new Error('Game is at full capacity');
      await tx.gameBooking.create({ data: { gameId, userId } });
      await tx.game.update({ where: { id: gameId }, data: { currentPlayers: { increment: 1 } } });
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
