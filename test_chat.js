const fetch = require('node-fetch');

async function testChat() {
  const url = 'http://localhost:3000/api/chat';
  const payload = { message: "Find weekend getaway to Maldives" };
  
  console.log('Testing query: "Find weekend getaway to Maldives"');
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error('Failed to fetch:', res.status, res.statusText);
      return;
    }
    
    const data = await res.json();
    console.log('AI Response:', data.aiMsg);
    console.log('Cruise Match:', JSON.stringify(data.cruiseMatch, null, 2));
    
    if (data.aiMsg.includes('Maldives') && data.aiMsg.includes('longer than a typical weekend getaway')) {
      console.log('✅ TEST PASSED: Fallback logic for location detected Maldives and explained the duration gap.');
    } else {
      console.log('❌ TEST FAILED: Response did not contain expected fallback message.');
    }
  } catch (err) {
    console.error('Error during test:', err.message);
    console.log('Note: Make sure the dev server is running on http://localhost:3000');
  }
}

testChat();
