import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cruise = await prisma.cruise.findFirst({
    where: { name: 'Arabian India King' },
    include: {
      restaurants: true,
      shows: true,
      games: true,
    }
  });

  if (!cruise) {
    console.log('Cruise "Arabian India King" not found.');
    return;
  }

  console.log(`Cruise: ${cruise.name} (ID: ${cruise.id})`);
  console.log(`Restaurants: ${cruise.restaurants.length}`);
  console.log(`Shows: ${cruise.shows.length}`);
  console.log(`Games: ${cruise.games.length}`);

  if (cruise.restaurants.length > 0) {
    console.log('Sample Dining Slot:', cruise.restaurants[0]);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
