import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Demo User Pool ────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { firstName: 'Arjun',    lastName: 'Sharma',    email: 'arjun.sharma@demo.com'    },
  { firstName: 'Priya',    lastName: 'Patel',     email: 'priya.patel@demo.com'     },
  { firstName: 'Rohan',    lastName: 'Mehta',     email: 'rohan.mehta@demo.com'     },
  { firstName: 'Divya',    lastName: 'Nair',      email: 'divya.nair@demo.com'      },
  { firstName: 'Kiran',    lastName: 'Reddy',     email: 'kiran.reddy@demo.com'     },
  { firstName: 'Sneha',    lastName: 'Iyer',      email: 'sneha.iyer@demo.com'      },
  { firstName: 'Vikram',   lastName: 'Singh',     email: 'vikram.singh@demo.com'    },
  { firstName: 'Anika',    lastName: 'Gupta',     email: 'anika.gupta@demo.com'     },
  { firstName: 'Rahul',    lastName: 'Verma',     email: 'rahul.verma@demo.com'     },
  { firstName: 'Meera',    lastName: 'Desai',     email: 'meera.desai@demo.com'     },
  { firstName: 'Sanjay',   lastName: 'Bose',      email: 'sanjay.bose@demo.com'     },
  { firstName: 'Kavya',    lastName: 'Pillai',    email: 'kavya.pillai@demo.com'    },
  { firstName: 'Nikhil',   lastName: 'Joshi',     email: 'nikhil.joshi@demo.com'    },
  { firstName: 'Lakshmi',  lastName: 'Rao',       email: 'lakshmi.rao@demo.com'     },
  { firstName: 'Aditya',   lastName: 'Kumar',     email: 'aditya.kumar@demo.com'    },
  { firstName: 'Pooja',    lastName: 'Malhotra',  email: 'pooja.malhotra@demo.com'  },
  { firstName: 'Tushar',   lastName: 'Shah',      email: 'tushar.shah@demo.com'     },
  { firstName: 'Ritu',     lastName: 'Kapoor',    email: 'ritu.kapoor@demo.com'     },
  { firstName: 'Gaurav',   lastName: 'Tiwari',    email: 'gaurav.tiwari@demo.com'   },
  { firstName: 'Ankita',   lastName: 'Banerjee',  email: 'ankita.banerjee@demo.com' },
];

async function main() {
  console.log('🌱 Seeding Royal Voyager database...');

  // ─── Clear Existing Data (order matters for FK constraints) ────────────────
  await prisma.restaurantBooking.deleteMany();
  await prisma.roomBooking.deleteMany();
  await prisma.showBooking.deleteMany();
  await prisma.gameBooking.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.show.deleteMany();
  await prisma.game.deleteMany();
  await prisma.cruise.deleteMany();
  await prisma.region.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ─── Admin User ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin', 12);
  const admin = await prisma.user.create({
    data: {
      firstName: 'Royal',
      lastName: 'Admin',
      email: 'admin@royalvoyager.com',
      mobile: '9000000000',
      password: adminHash,
      role: 'admin',
      dob: new Date('1985-01-01'),
      preferences: { theme: 'dark', notifications: true },
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ─── Demo Guest User ───────────────────────────────────────────────────────
  const guestHash = await bcrypt.hash('Demo@2026', 12);
  const guest = await prisma.user.create({
    data: {
      firstName: 'James',
      lastName: 'Harrington',
      email: 'guest@royalvoyager.com',
      mobile: '9876543210',
      password: guestHash,
      role: 'user',
      dob: new Date('1990-05-15'),
    },
  });
  console.log(`✅ Demo guest created: ${guest.email}`);

  // ─── 20 Demo Users ────────────────────────────────────────────────────────
  const demoPassword = await bcrypt.hash('Demo@2026', 12);
  const demoUsers: any[] = [];
  for (const u of DEMO_USERS) {
    const created = await prisma.user.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        mobile: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        password: demoPassword,
        role: 'user',
        dob: new Date(`19${75 + Math.floor(Math.random() * 20)}-0${1 + Math.floor(Math.random() * 9)}-15`),
      },
    });
    demoUsers.push(created);
  }
  console.log(`✅ Created ${demoUsers.length} demo users`);

  // All bookable users (guest + demo users)
  const allBookingUsers = [guest, ...demoUsers];

  // ─── Regions ───────────────────────────────────────────────────────────────
  const regAmericas    = await prisma.region.create({ data: { name: 'Americas' } });
  const regEurope      = await prisma.region.create({ data: { name: 'Europe' } });
  const regWithinIndia = await prisma.region.create({ data: { name: 'Within India' } });
  const regCaribbean   = await prisma.region.create({ data: { name: 'Caribbean' } });

  // ─── Cruises ──────────────────────────────────────────────────────────────
  const cruiseDefs = [
    // Within India
    { id: 'c-v1',  name: 'Voyage 1: Goa to Kochi',                   source: 'Goa',           destination: 'Kochi',            date: new Date('2026-04-10'), endDate: new Date('2026-04-15'), duration: 5,  basePrice: 12000, regionId: regWithinIndia.id },
    { id: 'c-v2',  name: 'Voyage 2: Kolkata to Lakshadweep',         source: 'Kolkata',        destination: 'Lakshadweep',      date: new Date('2026-04-12'), endDate: new Date('2026-04-16'), duration: 4,  basePrice: 9500,  regionId: regWithinIndia.id },
    { id: 'c-v3',  name: 'Voyage 3: Mumbai to Maldives',             source: 'Mumbai',         destination: 'Maldives',         date: new Date('2026-04-15'), endDate: new Date('2026-04-22'), duration: 7,  basePrice: 18000, regionId: regWithinIndia.id },
    { id: 'c-v4',  name: 'Voyage 4: Chennai to Andaman',             source: 'Chennai',        destination: 'Andaman',          date: new Date('2026-04-18'), endDate: new Date('2026-04-23'), duration: 5,  basePrice: 11000, regionId: regWithinIndia.id },
    { id: 'c-v5',  name: 'Voyage 5: Andaman to Chennai',             source: 'Andaman',        destination: 'Chennai',          date: new Date('2026-04-10'), endDate: new Date('2026-04-17'), duration: 7,  basePrice: 10500, regionId: regWithinIndia.id },
    { id: 'c-v6',  name: 'Voyage 6: Visakhapatnam to Mangalore',     source: 'Visakhapatnam',  destination: 'Mangalore',        date: new Date('2026-04-11'), endDate: new Date('2026-04-16'), duration: 5,  basePrice: 9800,  regionId: regWithinIndia.id },
    { id: 'c-v7',  name: 'Voyage 7: Visakhapatnam to Mangalore',     source: 'Visakhapatnam',  destination: 'Mangalore',        date: new Date('2026-04-09'), endDate: new Date('2026-04-13'), duration: 4,  basePrice: 9200,  regionId: regWithinIndia.id },
    { id: 'c-v8',  name: 'Voyage 8: Cochin to Sri Lanka',            source: 'Cochin',         destination: 'Sri Lanka',        date: new Date('2026-04-20'), endDate: new Date('2026-04-25'), duration: 5,  basePrice: 13500, regionId: regWithinIndia.id },
    { id: 'c-v9',  name: 'Voyage 9: Mumbai to Goa',                  source: 'Mumbai',         destination: 'Goa',              date: new Date('2026-04-22'), endDate: new Date('2026-04-25'), duration: 3,  basePrice: 7500,  regionId: regWithinIndia.id },
    { id: 'c-v10', name: 'Voyage 10: Kolkata to Visakhapatnam',      source: 'Kolkata',        destination: 'Visakhapatnam',    date: new Date('2026-04-18'), endDate: new Date('2026-04-25'), duration: 7,  basePrice: 10200, regionId: regWithinIndia.id },
    { id: 'c-v11', name: 'Voyage 11: Goa to Mumbai',                 source: 'Goa',            destination: 'Mumbai',           date: new Date('2026-04-25'), endDate: new Date('2026-04-28'), duration: 3,  basePrice: 7000,  regionId: regWithinIndia.id },
    { id: 'c-v12', name: 'Voyage 12: Kochi to Lakshadweep',          source: 'Cochin',         destination: 'Lakshadweep',      date: new Date('2026-04-28'), endDate: new Date('2026-05-02'), duration: 4,  basePrice: 14000, regionId: regWithinIndia.id },
    { id: 'c-v13', name: 'Voyage 13: Mumbai to Visakhapatnam',       source: 'Mumbai',         destination: 'Visakhapatnam',    date: new Date('2026-04-25'), endDate: new Date('2026-04-30'), duration: 5,  basePrice: 9000,  regionId: regWithinIndia.id },
    { id: 'c-v14', name: 'Voyage 14: Mumbai to Kochi',               source: 'Mumbai',         destination: 'Kochi',            date: new Date('2026-03-18'), endDate: new Date('2026-03-24'), duration: 6,  basePrice: 11500, regionId: regWithinIndia.id },
    { id: 'c-v15', name: 'Voyage 15: Chennai to Maldives',           source: 'Chennai',        destination: 'Maldives',         date: new Date('2026-05-01'), endDate: new Date('2026-05-08'), duration: 7,  basePrice: 17000, regionId: regWithinIndia.id },
    { id: 'c-v16', name: 'Voyage 16: Andaman to Goa',                source: 'Andaman',        destination: 'Goa',              date: new Date('2026-04-16'), endDate: new Date('2026-04-22'), duration: 6,  basePrice: 10800, regionId: regWithinIndia.id },
    { id: 'c-v17', name: 'Voyage 17: Chennai to Kochi',              source: 'Chennai',        destination: 'Kochi',            date: new Date('2026-03-28'), endDate: new Date('2026-04-01'), duration: 4,  basePrice: 8500,  regionId: regWithinIndia.id },
    { id: 'c-v18', name: 'Voyage 18: Mangalore to Kolkata',          source: 'Mangalore',      destination: 'Kolkata',          date: new Date('2026-04-21'), endDate: new Date('2026-04-25'), duration: 4,  basePrice: 9300,  regionId: regWithinIndia.id },
    { id: 'c-v19', name: 'Voyage 19: Kochi to Lakshadweep',          source: 'Kochi',          destination: 'Lakshadweep',      date: new Date('2026-03-29'), endDate: new Date('2026-04-03'), duration: 5,  basePrice: 15000, regionId: regWithinIndia.id },
    { id: 'c-v20', name: 'Voyage 20: Visakhapatnam to Kolkata',      source: 'Visakhapatnam',  destination: 'Kolkata',          date: new Date('2026-05-05'), endDate: new Date('2026-05-12'), duration: 7,  basePrice: 10500, regionId: regWithinIndia.id },
    { id: 'c-v21', name: 'Voyage 21: Goa to Andaman',                source: 'Goa',            destination: 'Andaman',          date: new Date('2026-05-10'), endDate: new Date('2026-05-17'), duration: 7,  basePrice: 12500, regionId: regWithinIndia.id },
    { id: 'c-v22', name: 'Voyage 22: Mumbai to Sri Lanka',           source: 'Mumbai',         destination: 'Sri Lanka',        date: new Date('2026-05-15'), endDate: new Date('2026-05-22'), duration: 7,  basePrice: 16000, regionId: regWithinIndia.id },
    // Americas
    { id: 'c-a1',  name: 'Alaska Wildlife Express',                  source: 'Vancouver',      destination: 'Alaska',           date: new Date('2026-05-01'), endDate: new Date('2026-05-11'), duration: 10, basePrice: 135000,regionId: regAmericas.id  },
    { id: 'c-a2',  name: 'Bahamas Sunseeker',                        source: 'Miami, Florida', destination: 'Bahamas',          date: new Date('2026-06-01'), endDate: new Date('2026-06-05'), duration: 4,  basePrice: 52000, regionId: regAmericas.id  },
    // Europe
    { id: 'c-e1',  name: 'Mediterranean Magic',                      source: 'Barcelona',      destination: 'Mediterranean',    date: new Date('2026-05-20'), endDate: new Date('2026-05-27'), duration: 7,  basePrice: 120000,regionId: regEurope.id    },
    { id: 'c-e2',  name: 'Ultimate Greek Isles',                     source: 'Barcelona',      destination: 'Greek Isles',      date: new Date('2026-06-15'), endDate: new Date('2026-06-22'), duration: 7,  basePrice: 102000,regionId: regEurope.id    },
    // Caribbean
    { id: 'c-c1',  name: 'East Caribbean Explorer',                  source: 'Miami, Florida', destination: 'East Caribbean',   date: new Date('2026-11-10'), endDate: new Date('2026-11-17'), duration: 7,  basePrice: 108000,regionId: regCaribbean.id },
  ];

  // Deck layout: category → deck number
  const DECK_MAP: Record<string, number> = {
    'Interior':   8,
    'Ocean View': 9,
    'Balcony':    10,
    'Luxury Suite': 11,
  };

  const createdCruises: any[] = [];

  for (const c of cruiseDefs) {
    const cruise = await prisma.cruise.create({ data: c });
    createdCruises.push(cruise);

    // ── Rooms (deck-mapped) ───────────────────────────────────────────────────
    await prisma.room.createMany({
      data: [
        { cruiseId: c.id, type: 'Interior',    deckNumber: 8,  price: c.basePrice * 0.75, totalRooms: 16, availableRooms: 16 },
        { cruiseId: c.id, type: 'Ocean View',  deckNumber: 9,  price: c.basePrice * 1.0,  totalRooms: 16, availableRooms: 16 },
        { cruiseId: c.id, type: 'Balcony',     deckNumber: 10, price: c.basePrice * 1.4,  totalRooms: 16, availableRooms: 16 },
        { cruiseId: c.id, type: 'Luxury Suite',deckNumber: 11, price: c.basePrice * 2.0,  totalRooms: 16, availableRooms: 16 },
      ],
      skipDuplicates: true,
    });

    // ── Restaurants (multiple slots per day) ──────────────────────────────────
    const restaurantVenues = [
      { name: 'The Grand Royal Buffet', slots: [
        { mealType: 'breakfast' as const, slotTime: '07:30', durationMinutes: 60 },
        { mealType: 'breakfast' as const, slotTime: '09:00', durationMinutes: 60 },
        { mealType: 'lunch'     as const, slotTime: '12:30', durationMinutes: 90 },
        { mealType: 'lunch'     as const, slotTime: '14:00', durationMinutes: 90 },
        { mealType: 'dinner'    as const, slotTime: '18:30', durationMinutes: 90 },
        { mealType: 'dinner'    as const, slotTime: '20:00', durationMinutes: 90 },
      ]},
      { name: 'Sunset Vista Grill', slots: [
        { mealType: 'breakfast' as const, slotTime: '08:00', durationMinutes: 60 },
        { mealType: 'lunch'     as const, slotTime: '13:00', durationMinutes: 90 },
        { mealType: 'dinner'    as const, slotTime: '19:30', durationMinutes: 90 },
        { mealType: 'dinner'    as const, slotTime: '21:00', durationMinutes: 90 },
      ]},
      { name: 'Oceanic Sapphire Dining', slots: [
        { mealType: 'dinner'    as const, slotTime: '20:30', durationMinutes: 120 },
      ]}
    ];

    for (let day = 0; day < c.duration; day++) {
      const slotDate = new Date(c.date);
      slotDate.setDate(slotDate.getDate() + day);
      for (const venue of restaurantVenues) {
        for (const slot of venue.slots) {
          await prisma.restaurant.create({
            data: {
              cruiseId: c.id,
              name: venue.name,
              mealType: slot.mealType,
              slotTime: slot.slotTime,
              slotDate,
              durationMinutes: slot.durationMinutes,
              capacity: 100,
              bookedCount: 0,
            },
          });
        }
      }
    }

    // ── Shows & Entertainment ───────────────────────────────────────────────
    const showPrototypes = [
      { name: 'Grand Indian Magic Show',    time: '19:00', durationMinutes: 90,  capacity: 150, rating: 4.9 },
      { name: 'Bollywood Dance Night',      time: '21:30', durationMinutes: 120, capacity: 200, rating: 4.8 },
      { name: 'Comedy Night Live',          time: '20:00', durationMinutes: 60,  capacity: 100, rating: 4.7 },
      { name: 'Classical Music Soiree',     time: '18:30', durationMinutes: 45,  capacity: 80,  rating: 4.6 },
    ];

    for (let day = 0; day < c.duration; day++) {
      const showDate = new Date(c.date);
      showDate.setDate(showDate.getDate() + day);
      for (const proto of showPrototypes) {
        await prisma.show.create({
          data: {
            cruiseId: c.id,
            name: proto.name,
            time: proto.time,
            showDate,
            durationMinutes: proto.durationMinutes,
            capacity: proto.capacity,
            bookedCount: 0,
          }
        });
      }
    }

    // ── Onboard Games ───────────────────────────────────────────────────────
    const gamePrototypes = [
      { name: 'Poolside Trivia Challenge',  time: '11:00', maxPlayers: 40 },
      { name: 'Casino Royale Tournament',   time: '22:00', maxPlayers: 50 },
      { name: 'Kids Treasure Hunt',         time: '10:00', maxPlayers: 30 },
      { name: 'Morning Yoga on Deck',       time: '07:00', maxPlayers: 25 },
    ];

    for (let day = 0; day < Math.min(c.duration, 3); day++) {
      const gameDate = new Date(c.date);
      gameDate.setDate(gameDate.getDate() + day);
      for (const proto of gamePrototypes) {
        await prisma.game.create({
          data: {
            cruiseId: c.id,
            name: proto.name,
            time: proto.time,
            gameDate,
            maxPlayers: proto.maxPlayers,
            currentPlayers: 0,
          }
        });
      }
    }

    console.log(`✅ Seeded cruise: ${c.name}`);
  }

  // ─── Realistic Bookings for Demo Users ────────────────────────────────────
  const indianCruises = createdCruises.filter(c => c.id.startsWith('c-v'));
  
  let bookingIndex = 0;
  for (const user of allBookingUsers) {
    const numBookings = 1 + Math.floor(Math.random() * 2);
    for (let b = 0; b < numBookings; b++) {
      const cruise = indianCruises[bookingIndex % indianCruises.length];
      bookingIndex++;

      const room = await prisma.room.findFirst({
        where: { cruiseId: cruise.id, availableRooms: { gt: 0 } },
      });
      if (!room) continue;

      const quantity = 1 + Math.floor(Math.random() * 2);
      const booking = await prisma.booking.create({
        data: {
          userId: user.id,
          cruiseId: cruise.id,
          totalPrice: room.price * quantity,
          roomNumber: `${room.deckNumber}${201 + b}`,
          status: 'confirmed',
          roomBookings: { create: { roomId: room.id, quantity } },
        },
      });

      // Add a restaurant
      const rest = await prisma.restaurant.findFirst({ where: { cruiseId: cruise.id } });
      if (rest) {
        await prisma.restaurantBooking.create({
          data: { bookingId: booking.id, restaurantId: rest.id, guestCount: quantity },
        });
        await prisma.restaurant.update({ where: { id: rest.id }, data: { bookedCount: { increment: quantity } } });
      }

      // Add 1-2 shows
      const shows = await prisma.show.findMany({ where: { cruiseId: cruise.id }, take: 2 });
      for (const s of shows) {
        await prisma.showBooking.create({ data: { userId: user.id, showId: s.id, bookingId: booking.id } });
        await prisma.show.update({ where: { id: s.id }, data: { bookedCount: { increment: 1 } } });
      }

      // Add 1 game
      const game = await prisma.game.findFirst({ where: { cruiseId: cruise.id } });
      if (game) {
        await prisma.gameBooking.create({ data: { userId: user.id, gameId: game.id, bookingId: booking.id } });
        await prisma.game.update({ where: { id: game.id }, data: { currentPlayers: { increment: 1 } } });
      }

      await prisma.room.update({ where: { id: room.id }, data: { availableRooms: { decrement: 1 } } });
    }
  }

  // ─── Waitlist Entries ─────────────────────────────────────────────────────
  const someShow = await prisma.show.findFirst({ where: { bookedCount: { gt: 0 } } });
  if (someShow) {
    await prisma.waitlist.create({
      data: { userId: demoUsers[0].id, eventType: 'show', showId: someShow.id, position: 1 }
    });
  }


  console.log('');
  console.log('🚀 Seeding complete!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   Admin : admin@royalvoyager.com / admin');
  console.log('   Guest : guest@royalvoyager.com / Demo@2026');
  console.log('   Demo  : arjun.sharma@demo.com  / Demo@2026');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
