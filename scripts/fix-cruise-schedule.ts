import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cruiseName = 'Arabian India King';
  const cruise = await prisma.cruise.findFirst({
    where: { name: cruiseName },
  });

  if (!cruise) {
    console.log(`Cruise "${cruiseName}" not found.`);
    return;
  }

  console.log(`Generating schedule for: ${cruise.name} (ID: ${cruise.id})`);

  const numDays = Math.min(Number(cruise.duration), 3);
  const startDate = new Date(cruise.date);

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

  console.log('✅ Schedule generated successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
