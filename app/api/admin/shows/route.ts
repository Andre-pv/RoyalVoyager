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
    const sort   = searchParams.get('sort')  ?? 'showDate';
    const order  = searchParams.get('order') === 'desc' ? 'desc' : 'asc';
    const skip   = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { cruise: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    } : {};

    // Only top-level scalar fields can be directly sorted; cruise.name requires a nested orderBy
    const orderBy: any = sort === 'cruise' ? { cruise: { name: order } } : { [sort]: order };

    const [shows, total] = await Promise.all([
      prisma.show.findMany({
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
      prisma.show.count({ where }),
    ]);

    return NextResponse.json({ shows, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { cruiseId, name, showDate, time, durationMinutes, capacity } = await req.json();
    const show = await prisma.show.create({
      data: { cruiseId, name, showDate: new Date(showDate), time, durationMinutes: Number(durationMinutes) || 60, capacity: Number(capacity) || 150 },
    });
    return NextResponse.json({ success: true, show });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { showId, userId } = await req.json();
    await prisma.$transaction(async (tx) => {
      const show = await tx.show.findUnique({ where: { id: showId } });
      if (!show) throw new Error('Show not found');
      if (show.bookedCount >= show.capacity) throw new Error('Show is at full capacity');
      await tx.showBooking.create({ data: { showId, userId } });
      await tx.show.update({ where: { id: showId }, data: { bookedCount: { increment: 1 } } });
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
