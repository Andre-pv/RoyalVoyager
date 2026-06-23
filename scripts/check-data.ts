import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const showCount = await prisma.show.count();
  const gameCount = await prisma.game.count();
  const restCount = await prisma.restaurant.count();
  
  console.log(`Shows: ${showCount}`);
  console.log(`Games: ${gameCount}`);
  console.log(`Restaurants: ${restCount}`);

  if (showCount > 0) {
    const show = await prisma.show.findFirst({
        include: { cruise: true, _count: { select: { bookings: true } } }
    });
    console.log('Sample Show:', JSON.stringify(show, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
