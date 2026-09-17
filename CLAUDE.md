# CLAUDE.md — Claude Code & AI Agent Quick Guide

> For complete architectural maps, flowcharts, and detailed task matrices, see **[`AGENTS.md`](./AGENTS.md)**.

## Commands
```bash
npm run dev     # Start dev server
npm run build   # Verify TypeScript and build (Run this before completing tasks)
npm run lint    # ESLint check
npm run bot     # Run autonomous bot daemon
```

## Critical Rules for AI Agents
1. **Root Directory Only:** Never touch or edit files in `indicator/` (it's an old nested backup). Only edit the root `app/`, `components/`, `lib/`, and `scripts/`.
2. **Surgical Edits:** `lib/indicators.ts` (~10k lines) and `components/AnalysisCard.tsx` (~5k lines) are very large. Never replace entire files. Use precise, targeted edits.
3. **Verification:** Always run `npm run build` after editing to ensure TypeScript compiles without errors.

## Fast Navigation Map
- **Market Data Feeds:** `lib/marketService.ts`
- **Indicator Engine:** `lib/indicators.ts`
- **Trading Strategy & Rules:** `lib/geminiService.ts` & `lib/confluenceEngine.ts`
- **Risk & Sizing:** `lib/riskEngine.ts`
- **Autonomous Scanner:** `lib/autonomousEngine.ts` & `app/api/autonomous-scanner/route.ts`
- **Telegram Broadcasting:** `lib/telegramService.ts` & `lib/db.ts`
- **Database & Cache:** `lib/db.ts` & `lib/cache.ts`
- **UI Dashboard & Tabs:** `app/page.tsx`
- **Chart Component:** `components/MarketChart.tsx`
