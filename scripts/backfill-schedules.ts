import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cruises = await prisma.cruise.findMany();
  console.log(`Checking ${cruises.length} cruises for missing schedule days...`);

  const restaurantVenues = [
    { name: 'The Grand Royal Buffet', slots: [
      { mealType: 'breakfast' as const, slotTime: '07:30', durationMinutes: 60 },
      { mealType: 'lunch'     as const, slotTime: '12:30', durationMinutes: 90 },
      { mealType: 'dinner'    as const, slotTime: '18:30', durationMinutes: 90 },
    ]},
    { name: 'Sunset Vista Grill', slots: [
      { mealType: 'dinner'    as const, slotTime: '19:30', durationMinutes: 90 },
    ]}
  ];

  const showPrototypes = [
    { name: 'Grand Indian Magic Show',    time: '19:00', durationMinutes: 90,  capacity: 150 },
    { name: 'Bollywood Dance Night',      time: '21:30', durationMinutes: 120, capacity: 200 },
  ];

  const gamePrototypes = [
    { name: 'Poolside Trivia Challenge',  time: '11:00', maxPlayers: 40 },
    { name: 'Morning Yoga on Deck',       time: '07:00', maxPlayers: 25 },
  ];

  for (const c of cruises) {
    console.log(`\nProcessing: ${c.name} (${c.duration} nights)`);
    let addedCount = 0;

    for (let day = 0; day < c.duration; day++) {
      const targetDate = new Date(c.date);
      targetDate.setDate(targetDate.getDate() + day);
      
      // Check if any restaurant slots exist for this day
      const exists = await prisma.restaurant.findFirst({
        where: { cruiseId: c.id, slotDate: targetDate }
      });

      if (!exists) {
        console.log(`  - Adding Day ${day + 1} (${targetDate.toDateString()})`);
        
        // Add Restaurants
        for (const venue of restaurantVenues) {
          for (const slot of venue.slots) {
            await prisma.restaurant.create({
              data: {
                cruiseId: c.id,
                name: venue.name,
                mealType: slot.mealType,
                slotTime: slot.slotTime,
                slotDate: targetDate,
                durationMinutes: slot.durationMinutes,
                capacity: 100,
              }
            });
          }
        }

        // Add Shows
        for (const proto of showPrototypes) {
          await prisma.show.create({
            data: {
              cruiseId: c.id,
              name: proto.name,
              time: proto.time,
              showDate: targetDate,
              durationMinutes: proto.durationMinutes,
              capacity: proto.capacity,
            }
          });
        }

        // Add Games
        for (const proto of gamePrototypes) {
          await prisma.game.create({
            data: {
              cruiseId: c.id,
              name: proto.name,
              time: proto.time,
              gameDate: targetDate,
              maxPlayers: proto.maxPlayers,
            }
          });
        }
        addedCount++;
      }
    }
    console.log(`  Done: Added ${addedCount} missing days.`);
  }

  console.log('\n✅ Backfill complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
