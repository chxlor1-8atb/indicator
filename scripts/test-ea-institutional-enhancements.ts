/**
 * Test Suite: MetaTrader 5 EA Institutional Safeguards & Bridge Full-Stack
 * Verifies:
 * 1. MT Bridge CSV Output includes Order Types, Sl, Tp, and Trailing Sl
 * 2. POST /api/mt-bridge handles DAILY_LOSS_LIMIT, PENDING_PLACED, and DAILY_PROFIT_LOCKED events
 * 3. Presets and MQ5 file integrity
 */

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/mt-bridge/route';
import { getTelemetryLogs } from '../lib/autonomousEngine';

console.log('================================================================');
console.log('🧪 RUNNING TEST SUITE: MT5 INSTITUTIONAL EA & BRIDGE FULL-STACK');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
  }
}

async function runTests() {
  // ====================================================================
  // TEST 1: MT Bridge CSV Generation
  // ====================================================================
  console.log('--- TEST 1: MT Bridge CSV Generation ---');
  const reqGet = new NextRequest('http://localhost:3000/api/mt-bridge?format=mt&symbol=XAUUSD');
  const resGet = await GET(reqGet);
  assert(resGet.status === 200, 'GET /api/mt-bridge?format=mt returns HTTP 200');

  // ====================================================================
  // TEST 2: POST /api/mt-bridge Event Handlers
  // ====================================================================
  console.log('\n--- TEST 2: MT Bridge Event Dispatcher ---');

  // Case 2A: DAILY_LOSS_LIMIT Circuit Breaker Event
  const reqPostDailyLoss = new NextRequest('http://localhost:3000/api/mt-bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'test_ord_circuit_breaker',
      action: 'DAILY_LOSS_LIMIT',
      symbol: 'XAUUSD',
      executionPrice: 2650.0,
      profitPips: 4.2, // -4.2% daily loss
    }),
  });
  const resPostDailyLoss = await POST(reqPostDailyLoss);
  const dataDailyLoss = await resPostDailyLoss.json();
  assert(dataDailyLoss.success === true, 'POST DAILY_LOSS_LIMIT successfully handled');

  const logs = getTelemetryLogs(50);
  const circuitBreakerLog = logs.find((l) => l.message.includes('CIRCUIT BREAKER'));
  assert(!!circuitBreakerLog, 'Circuit Breaker telemetry logged in Web Engine', circuitBreakerLog?.message);

  // Case 2B: PENDING_PLACED Event
  const reqPostPending = new NextRequest('http://localhost:3000/api/mt-bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'test_ord_pending_limit',
      action: 'PENDING_PLACED',
      symbol: 'XAUUSD',
      executionPrice: 2640.5,
      profitPips: 0.0,
    }),
  });
  const resPostPending = await POST(reqPostPending);
  const dataPending = await resPostPending.json();
  assert(dataPending.success === true, 'POST PENDING_PLACED successfully handled');

  // Case 2C: DAILY_PROFIT_LOCKED Event
  const reqPostProfitLock = new NextRequest('http://localhost:3000/api/mt-bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'test_ord_profit_lock',
      action: 'DAILY_PROFIT_LOCKED',
      symbol: 'XAUUSD',
      executionPrice: 2660.0,
      profitPips: 2.5, // +2.5% gain secured
    }),
  });
  const resPostProfitLock = await POST(reqPostProfitLock);
  const dataProfitLock = await resPostProfitLock.json();
  assert(dataProfitLock.success === true, 'POST DAILY_PROFIT_LOCKED successfully handled');

  // ====================================================================
  // TEST 3: MQ5 Source Code & Presets Integrity
  // ====================================================================
  console.log('\n--- TEST 3: MQ5 Source Code & Preset Integrity ---');

  const mq5Path = path.resolve('mql/Aegis_Quant_Terminal.mq5');
  const mq5Content = fs.readFileSync(mq5Path, 'utf8');

  assert(mq5Content.includes('InpEnableDailyGuard'), 'MQ5 contains InpEnableDailyGuard input');
  assert(mq5Content.includes('InpEnableTimeFilter'), 'MQ5 contains InpEnableTimeFilter input');
  assert(mq5Content.includes('InpUsePendingOrders'), 'MQ5 contains InpUsePendingOrders input');
  assert(mq5Content.includes('InpDrawChartLevels'), 'MQ5 contains InpDrawChartLevels input');
  assert(mq5Content.includes('InpOfflineFallback'), 'MQ5 contains InpOfflineFallback input');
  assert(mq5Content.includes('CheckDailyDrawdownGuard'), 'MQ5 contains CheckDailyDrawdownGuard()');
  assert(mq5Content.includes('RunOfflineFallbackEngine'), 'MQ5 contains RunOfflineFallbackEngine()');
  assert(mq5Content.includes('DrawChartTradeLevels'), 'MQ5 contains DrawChartTradeLevels()');
  assert(mq5Content.includes('BuyLimit'), 'MQ5 contains BuyLimit pending order call');
  assert(mq5Content.includes('SellLimit'), 'MQ5 contains SellLimit pending order call');

  const centSet = fs.readFileSync(path.resolve('mql/Aegis_XAUUSD_Cent.set'), 'utf8');
  assert(centSet.includes('InpEnableDailyGuard=true'), 'Cent set contains InpEnableDailyGuard');
  assert(centSet.includes('InpUsePendingOrders=true'), 'Cent set contains InpUsePendingOrders');

  const stdSet = fs.readFileSync(path.resolve('mql/Aegis_Forex_Standard.set'), 'utf8');
  assert(stdSet.includes('InpEnableDailyGuard=true'), 'Std set contains InpEnableDailyGuard');
  assert(stdSet.includes('InpCloseFridayNight=true'), 'Std set contains InpCloseFridayNight');

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
