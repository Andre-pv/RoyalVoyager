import { prisma } from '../lib/prisma';
import { bookShowTransaction, cancelBookingTransaction } from '../app/actions/booking';

async function verify() {
  console.log('🧪 Starting Booking System Verification...');

  // 1. Get a cruise and a show
  const show = await prisma.show.findFirst({ include: { cruise: true } });
  if (!show) {
    console.error('❌ No show found to test with. Seed the DB first!');
    return;
  }

  // 2. Create mock users
  const userA = await prisma.user.upsert({
    where: { email: 'userA@test.com' },
    update: {},
    create: { firstName: 'User', lastName: 'A', email: 'userA@test.com', mobile: '00000', password: 'pw', dob: new Date() }
  });
  const userB = await prisma.user.upsert({
    where: { email: 'userB@test.com' },
    update: {},
    create: { firstName: 'User', lastName: 'B', email: 'userB@test.com', mobile: '00001', password: 'pw', dob: new Date() }
  });

  console.log(`Testing with show: ${show.name} (Capacity: ${show.capacity}, Current: ${show.bookedCount})`);

  // 3. Fill the show to capacity
  // For testing, let's temporarily set capacity to 1 if it's large
  await prisma.show.update({ where: { id: show.id }, data: { capacity: 1, bookedCount: 0 } });
  await prisma.showBooking.deleteMany({ where: { showId: show.id } });
  await prisma.waitlist.deleteMany({ where: { showId: show.id } });

  console.log('--- Step 1: Booking User A (Should Succeed) ---');
  const res1 = await bookShowTransaction(userA.id, show.id);
  console.log('Result:', res1);

  console.log('--- Step 2: Booking User B (Should Waitlist) ---');
  const res2 = await bookShowTransaction(userB.id, show.id);
  console.log('Result:', res2);

  const waitlistCount = await prisma.waitlist.count({ where: { showId: show.id } });
  console.log(`Waitlist count for show: ${waitlistCount}`);

  console.log('--- Step 3: User A Cancels (User B should be promoted) ---');
  const res3 = await cancelBookingTransaction(userA.id, show.id, 'show');
  console.log('Result:', res3);

  const bookingB = await prisma.showBooking.findUnique({
    where: { showId_userId: { showId: show.id, userId: userB.id } }
  });
  
  if (bookingB) {
    console.log('✅ SUCCESS: User B was automatically promoted from waitlist to booking!');
  } else {
    console.error('❌ FAILURE: User B was not promoted.');
  }

  // Cleanup
  await prisma.show.update({ where: { id: show.id }, data: { capacity: show.capacity } });
  console.log('🧪 Verification complete.');
}

verify().catch(console.error);
