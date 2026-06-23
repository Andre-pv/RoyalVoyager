import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

// GET: All cruises with booking count
export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cruises = await prisma.cruise.findMany({
      include: {
        _count: { select: { bookings: true, rooms: true } },
        region: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ cruises });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new cruise
export async function POST(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, source, destination, date, duration, basePrice, regionId, ship } = body;

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Number(duration));

    const cruise = await prisma.cruise.create({
      data: {
        name,
        source,
        destination,
        date: startDate,
        endDate: endDate,
        duration: Number(duration),
        basePrice: Number(basePrice),
        ship: ship || "MV Ocean Star",
        regionId: regionId || null,
      },
    });

    // Auto-create default rooms
    await prisma.room.createMany({
      data: [
        { cruiseId: cruise.id, type: 'Interior',    deckNumber: 8,  price: basePrice * 0.75, totalRooms: 40, availableRooms: 40 },
        { cruiseId: cruise.id, type: 'Ocean View',  deckNumber: 9,  price: basePrice * 1.0,  totalRooms: 25, availableRooms: 25 },
        { cruiseId: cruise.id, type: 'Balcony',     deckNumber: 10, price: basePrice * 1.4,  totalRooms: 15, availableRooms: 15 },
        { cruiseId: cruise.id, type: 'Luxury Suite',deckNumber: 11, price: basePrice * 2.0,  totalRooms: 5,  availableRooms: 5  },
      ],
    });

    // Auto-create default schedules (Dining, Shows, Games) for the full duration
    const numDays = Number(duration);
    
    // 1. Restaurants
    const venues = [
      { name: 'The Grand Royal Buffet', slots: [
        { mealType: 'breakfast' as const, time: '08:00' },
        { mealType: 'lunch'     as const, time: '13:00' },
        { mealType: 'dinner'    as const, time: '19:30' },
      ]},
      { name: 'Sunset Vista Grill', slots: [
        { mealType: 'dinner'    as const, time: '20:30' },
      ]}
    ];

    for (let i = 0; i < numDays; i++) {
      const slotDate = new Date(startDate);
      slotDate.setDate(slotDate.getDate() + i);
      
      for (const v of venues) {
        for (const s of v.slots) {
          await prisma.restaurant.create({
            data: {
              cruiseId: cruise.id,
              name: v.name,
              mealType: s.mealType,
              slotTime: s.time,
              slotDate,
              capacity: 100
            }
          });
        }
      }
    }

    // 2. Shows & Games
    const showProtos = [
      { name: 'Grand Indian Magic Show', time: '19:00' },
      { name: 'Bollywood Dance Night',   time: '21:30' },
    ];
    const gameProtos = [
      { name: 'Poolside Trivia',    time: '11:00' },
      { name: 'Morning Yoga',       time: '07:30' },
    ];

    for (let i = 0; i < numDays; i++) {
      const eventDate = new Date(startDate);
      eventDate.setDate(eventDate.getDate() + i);

      for (const sp of showProtos) {
        await prisma.show.create({
          data: { cruiseId: cruise.id, name: sp.name, time: sp.time, showDate: eventDate, capacity: 150 }
        });
      }
      for (const gp of gameProtos) {
        await prisma.game.create({
          data: { cruiseId: cruise.id, name: gp.name, time: gp.time, gameDate: eventDate, maxPlayers: 30 }
        });
      }
    }

    return NextResponse.json({ success: true, cruise });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a cruise
export async function DELETE(req: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { cruiseId } = await req.json();
    await prisma.cruise.delete({ where: { id: cruiseId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
