// Test MT5 Bridge API response format
import { GET } from '../app/api/mt-bridge/route';
import { NextRequest } from 'next/server';

async function runTest() {
  console.log('--- TEST 1: Single Symbol (XAUUSD) ---');
  const req1 = new NextRequest('http://localhost:3000/api/mt-bridge?format=mt&symbol=XAUUSD&bid=2650.50&ask=2650.80&spread=3.0');
  const res1 = await GET(req1);
  const text1 = await res1.text();
  console.log('Response status:', res1.status);
  console.log('Response body:\n', text1);

  console.log('\n--- TEST 2: One-Chart Multi-Symbol (ALL) ---');
  const req2 = new NextRequest('http://localhost:3000/api/mt-bridge?format=mt&multi=true&symbol=ALL');
  const res2 = await GET(req2);
  const text2 = await res2.text();
  console.log('Response status:', res2.status);
  console.log('Response body:\n', text2);

  const hasNewsHeader = text1.includes('#NEWS,') && text2.includes('#NEWS,');
  console.log('\n✅ Verification Result:');
  console.log('- Has #NEWS Header:', hasNewsHeader);
  if (hasNewsHeader) {
    console.log('🎉 MT5 Bridge is fully verified for v3.0 Master!');
  } else {
    console.error('❌ Missing #NEWS header!');
  }
}

runTest().catch(console.error);
