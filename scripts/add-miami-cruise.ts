import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Find the Americas region
  let region = await prisma.region.findFirst({
    where: { name: { contains: 'Americas', mode: 'insensitive' } }
  });

  if (!region) {
    // If it doesn't exist (unlikely), create it
    region = await prisma.region.create({ data: { name: 'Americas' } });
    console.log('Created Americas region.');
  } else {
    console.log(`Found region: ${region.name} (ID: ${region.id})`);
  }

  // 2. Create the Miami Cruise
  const cruiseDate = new Date('2026-11-15');
  const endDate = new Date(cruiseDate);
  endDate.setDate(endDate.getDate() + 7);

  const miamiCruise = await prisma.cruise.create({
    data: {
      name: 'Miami Sunshine Express',
      source: 'New York',
      destination: 'Miami, Florida',
      date: cruiseDate,
      endDate: endDate,
      duration: 7,
      basePrice: 45000,
      ship: 'MV Ocean Star',
      regionId: region.id,
      imageUrl: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?q=80&w=1000',
      description: 'Experience the magic of the Florida coast with our signature Miami voyage.'
    }
  });

  console.log(`✅ Created Cruise: ${miamiCruise.name} in ${region.name}`);

  // 3. Create Rooms
  await prisma.room.createMany({
    data: [
      { cruiseId: miamiCruise.id, type: 'Interior',    deckNumber: 8,  price: miamiCruise.basePrice * 0.75, totalRooms: 40, availableRooms: 40 },
      { cruiseId: miamiCruise.id, type: 'Ocean View',  deckNumber: 9,  price: miamiCruise.basePrice * 1.0,  totalRooms: 25, availableRooms: 25 },
      { cruiseId: miamiCruise.id, type: 'Balcony',     deckNumber: 10, price: miamiCruise.basePrice * 1.4,  totalRooms: 15, availableRooms: 15 },
      { cruiseId: miamiCruise.id, type: 'Luxury Suite',deckNumber: 11, price: miamiCruise.basePrice * 2.0,  totalRooms: 5,  availableRooms: 5  },
    ]
  });

  // 4. Create Dining Slots
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

  for (let i = 0; i < 3; i++) {
    const slotDate = new Date(cruiseDate);
    slotDate.setDate(slotDate.getDate() + i);
    for (const v of venues) {
      for (const s of v.slots) {
        await prisma.restaurant.create({
          data: {
            cruiseId: miamiCruise.id,
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

  console.log('✅ Schedule and rooms generated for Miami Cruise!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
