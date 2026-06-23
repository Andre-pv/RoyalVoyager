import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing database connection and data...');
  
  try {
    const cruises = await prisma.cruise.findMany({
      include: {
        rooms: true,
        shows: true,
        games: true,
        restaurants: true,
      }
    });

    console.log(`✅ Connection successful. Found ${cruises.length} cruises.`);
    
    cruises.forEach(cruise => {
      console.log(`\n🚢 Cruise: ${cruise.name} (ID: ${cruise.id})`);
      console.log(`   - Rooms: ${cruise.rooms.length}`);
      console.log(`   - Shows: ${cruise.shows.length}`);
      console.log(`   - Games: ${cruise.games.length}`);
      console.log(`   - Restaurants: ${cruise.restaurants.length}`);
    });

    const userCount = await prisma.user.count();
    console.log(`\n👤 Total Users: ${userCount}`);

    const guest = await prisma.user.findUnique({
      where: { email: 'guest@royalvoyager.com' }
    });
    
    if (guest) {
      console.log(`✅ Demo guest 'guest@royalvoyager.com' found.`);
    } else {
      console.error(`❌ Demo guest 'guest@royalvoyager.com' NOT found.`);
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
