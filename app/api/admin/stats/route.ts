import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [totalCruises, totalBookings, totalWaitlists, revenueData] = await Promise.all([
      prisma.cruise.count(),
      prisma.booking.count(),
      prisma.waitlist.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: { status: 'confirmed' },
      }),
    ]);

    const revenue = revenueData._sum.totalPrice ?? 0;

    return NextResponse.json({
      totalCruises,
      totalBookings,
      totalWaitlists,
      revenue,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
