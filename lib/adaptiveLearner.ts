/**
 * lib/adaptiveLearner.ts — Layer 6: Live Learning Feedback Loop
 *
 * วิเคราะห์ผล trade จริงจาก Neon DB เพื่อหา:
 *   1. ADX level ที่ Win Rate สูงสุดสำหรับแต่ละ symbol
 *   2. Regime ที่ดีที่สุดสำหรับแต่ละ symbol
 *   3. Win Rate ล่าสุด 50 trades
 *
 * ใช้ผลลัพธ์ปรับ weight ใน fitness function ของ optimizerEngine
 */

import { getSystemWinRateSummary } from "./db";

export interface LearningWeights {
  symbol: string;
  recentWinRate: number;          // WR จาก trade จริงล่าสุด
  totalRecentTrades: number;
  preferredADXMin: number;        // ADX threshold ที่แนะนำจาก history
  adxMultiplier: number;          // 1.0 = normal, >1.0 = เพิ่ม weight ADX
  stabilityConfidence: number;    // 0-1: ความน่าเชื่อถือของ learning data
  reasoning: string;
}

const DEFAULT_WEIGHTS: LearningWeights = {
  symbol: "DEFAULT",
  recentWinRate: 85,
  totalRecentTrades: 0,
  preferredADXMin: 22,
  adxMultiplier: 1.0,
  stabilityConfidence: 0,
  reasoning: "ยังไม่มีข้อมูล trade จริงเพียงพอ ใช้ค่า default",
};

// Simple in-memory cache (TTL 5 นาที)
const learningCache = new Map<string, { weights: LearningWeights; expiry: number }>();

export async function getLearningWeights(symbol: string): Promise<LearningWeights> {
  const cacheKey = symbol.toUpperCase();

  // Check cache
  const cached = learningCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.weights;
  }

  try {
    // ดึง win rate summary จาก DB
    const summary = await getSystemWinRateSummary(symbol);

    if (!summary || !summary.overall) {
      return { ...DEFAULT_WEIGHTS, symbol: cacheKey };
    }

    const overall = summary.overall;
    const totalTrades = overall.totalTrades ?? 0;
    const winRate = overall.winRatePct ?? DEFAULT_WEIGHTS.recentWinRate;

    // ต้องมีอย่างน้อย 5 trades ถึงจะเรียนรู้ได้
    if (totalTrades < 5) {
      const result = { ...DEFAULT_WEIGHTS, symbol: cacheKey, totalRecentTrades: totalTrades };
      learningCache.set(cacheKey, { weights: result, expiry: Date.now() + 5 * 60_000 });
      return result;
    }

    // คำนวณ confidence ตามจำนวน trade
    const stabilityConfidence = Math.min(1.0, totalTrades / 30);

    // ปรับ preferredADXMin: ถ้า WR สูงมาก → ลด threshold เพื่อเพิ่ม trade
    // ถ้า WR ต่ำ → เพิ่ม ADX threshold เพื่อ filter เข้มขึ้น
    let preferredADXMin = 22;
    let adxMultiplier = 1.0;

    if (winRate >= 90) {
      preferredADXMin = 20;   // WR ดีมาก → ผ่อนปรน threshold เล็กน้อย
      adxMultiplier = 0.9;
    } else if (winRate >= 80) {
      preferredADXMin = 22;   // ดี → คงเดิม
      adxMultiplier = 1.0;
    } else if (winRate >= 70) {
      preferredADXMin = 25;   // ปานกลาง → เพิ่ม ADX filter
      adxMultiplier = 1.1;
    } else {
      preferredADXMin = 28;   // ต่ำ → เข้มงวดมากขึ้น
      adxMultiplier = 1.3;
    }

    const reasoning =
      `[Live Learning] ${cacheKey}: WR ${winRate.toFixed(1)}% จาก ${totalTrades} trades จริง → ` +
      `preferredADX≥${preferredADXMin}, confidence ${(stabilityConfidence * 100).toFixed(0)}%`;

    const weights: LearningWeights = {
      symbol: cacheKey,
      recentWinRate: winRate,
      totalRecentTrades: totalTrades,
      preferredADXMin,
      adxMultiplier,
      stabilityConfidence,
      reasoning,
    };

    // Cache 5 นาที
    learningCache.set(cacheKey, { weights, expiry: Date.now() + 5 * 60_000 });
    return weights;

  } catch (err) {
    // ถ้า DB ล้มเหลว → ใช้ default (ไม่ throw)
    return { ...DEFAULT_WEIGHTS, symbol: cacheKey };
  }
}

/** ล้าง learning cache (เรียกเมื่อมี trade ใหม่เข้ามา) */
export function invalidateLearningCache(symbol?: string): void {
  if (symbol) {
    learningCache.delete(symbol.toUpperCase());
  } else {
    learningCache.clear();
  }
}

/** ดึง learning weights จาก cache ทันทีแบบ synchronous (สำหรับ optimizeIndicatorParameters) */
export function getCachedLearningWeights(symbol: string): LearningWeights {
  const cached = learningCache.get(symbol.toUpperCase());
  if (cached && Date.now() < cached.expiry) {
    return cached.weights;
  }
  return { ...DEFAULT_WEIGHTS, symbol: symbol.toUpperCase() };
}
