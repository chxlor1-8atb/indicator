"use client";

import React, { useState } from "react";
import { AnalysisResult } from "@/lib/types";
import {
  Sparkles,
  Send,
  ShieldAlert,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Info,
  Layers,
  AlertTriangle,
  Copy,
  Check,
  Award,
  BarChart3,
  Sliders,
  History,
  Zap,
  ArrowRight,
  Compass,
  MapPin,
  Flame,
  ShieldCheck,
  Gauge,
  Lock,
  Timer,
  Radio,
  Clock3,
  Calendar,
  AlertOctagon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Calculator,
  Brain,
  Database,
  Cpu,
  Activity,
  Scale
} from "lucide-react";
import { StrategyPersonaSelector } from "./StrategyPersonaSelector";
import HeroExecutionHUD from "./HeroExecutionHUD";

interface AnalysisCardProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  onSendTelegram: () => void;
  isSendingTelegram: boolean;
  telegramStatus: { success: boolean; message: string } | null;
}

export default function AnalysisCard({
  analysis,
  isLoading,
  onSendTelegram,
  isSendingTelegram,
  telegramStatus,
}: AnalysisCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPlaybookGuide, setShowPlaybookGuide] = useState<boolean>(false);
  const [customBalance, setCustomBalance] = useState<number>(10);
  const [customRiskPct, setCustomRiskPct] = useState<number>(2);
  const [accountType, setAccountType] = useState<"STANDARD" | "CENT">("STANDARD");
  const [activeQuantLayer, setActiveQuantLayer] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [activeCardTab, setActiveCardTab] = useState<"STRATEGY" | "DEEP_QUANT">("STRATEGY");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFullPlan = () => {
    if (!analysis) return;
    const mc = analysis.masterConfluence;
    const reg = analysis.regimeInfo;
    const sess = analysis.sessionStatus;
    const cal = analysis.calendarSafety;
    const ote = analysis.tradeSetup.oteZone || analysis.oteZone;
    const ssl = analysis.tradeSetup.structuralSL;
    const be = analysis.tradeSetup.breakevenAdvice || analysis.breakevenAdvice;
    const vd = analysis.volumeDelta;
    const vp = analysis.tradeSetup.volumeProfile || analysis.volumeProfile;
    const td = analysis.tdSequential;
    const ts = analysis.tradeSetup.trailingStop || analysis.trailingStop;
    const sp = analysis.tradeSetup.spreadImpact || analysis.spreadImpact;
    const vwap = analysis.tradeSetup.anchoredVwap || analysis.anchoredVwap;
    const cvd = analysis.tradeSetup.cvd || analysis.cvd;
    const ob = analysis.tradeSetup.orderBlocks || analysis.orderBlocks;
    const kelly = analysis.tradeSetup.kellySizing || analysis.kellySizing;
    const swp = analysis.tradeSetup.sessionSweep || analysis.sessionSweep;
    const fib = analysis.tradeSetup.fibonacciCluster || analysis.fibonacciCluster;
    const rv = analysis.tradeSetup.realizedVolatility || analysis.realizedVolatility;
    const micro = analysis.tradeSetup.candleMicrostructure || analysis.candleMicrostructure;
    const shield = analysis.tradeSetup.correlationShield || analysis.correlationShield;
    const fvg = analysis.tradeSetup.fvgMitigation || analysis.fvgMitigation;
    const mss = analysis.tradeSetup.marketStructureShift || analysis.marketStructureShift;
    const pd = analysis.tradeSetup.premiumDiscount || analysis.premiumDiscount;
    const key = analysis.tradeSetup.keyLevelTargets || analysis.keyLevelTargets;
    const flow = analysis.tradeSetup.orderFlowVelocity || analysis.orderFlowVelocity;
    const beLadder = analysis.tradeSetup.breakevenLadder || analysis.breakevenLadder;
    const lVoid = analysis.tradeSetup.liquidityVoid || analysis.liquidityVoid;
    const fibExt = analysis.tradeSetup.fibonacciExtension || analysis.fibonacciExtension;
    const vsa = analysis.tradeSetup.footprintAbsorption || analysis.footprintAbsorption;
    const mtf = analysis.tradeSetup.mtfStructureMatrix || analysis.mtfStructureMatrix;
    const idm = analysis.tradeSetup.liquidityInducement || analysis.liquidityInducement;
    const chos = analysis.tradeSetup.institutionalChoS || analysis.institutionalChoS;
    const drb = analysis.tradeSetup.dynamicRiskBracket || analysis.dynamicRiskBracket;
    const rej = analysis.tradeSetup.rejectionBlock || analysis.rejectionBlock;
    const mcpi = analysis.tradeSetup.mcpiConviction || analysis.mcpiConviction;
    const harm = analysis.tradeSetup.harmonics || analysis.harmonics;
    const mesa = analysis.tradeSetup.ehlersMESA || analysis.ehlersMESA;
    const ent = analysis.tradeSetup.shannonEntropy || analysis.shannonEntropy;
    const cs = analysis.tradeSetup.candlestickPatterns || analysis.candlestickPatterns;
    const m50 = analysis.tradeSetup.milestone50 || analysis.milestone50;
    const hurst = analysis.tradeSetup.hurstExponent || analysis.hurstExponent;
    const kalman = analysis.tradeSetup.kalmanFilter || analysis.kalmanFilter;
    const hl = analysis.tradeSetup.halfLife || analysis.halfLife;
    const ttm = analysis.tradeSetup.ttmSqueeze || analysis.ttmSqueeze;
    const cmf = analysis.tradeSetup.chaikinMoneyFlow || analysis.chaikinMoneyFlow;
    const kama = analysis.tradeSetup.kama || analysis.kama;
    const hma = analysis.tradeSetup.hma || analysis.hma;
    const sar = analysis.tradeSetup.parabolicSAR || analysis.parabolicSAR;
    const aroon = analysis.tradeSetup.aroon || analysis.aroon;
    const vortex = analysis.tradeSetup.vortex || analysis.vortex;
    const fisher = analysis.tradeSetup.fisher || analysis.fisher;
    const crsi = analysis.tradeSetup.connorsRSI || analysis.connorsRSI;
    const ao = analysis.tradeSetup.awesomeOsc || analysis.awesomeOsc;
    const tsi = analysis.tradeSetup.tsi || analysis.tsi;
    const advVol = analysis.tradeSetup.advancedVol || analysis.advancedVol;
    const keltner = analysis.tradeSetup.keltner || analysis.keltner;
    const donchian = analysis.tradeSetup.donchian || analysis.donchian;
    const cvol = analysis.tradeSetup.chaikinVol || analysis.chaikinVol;
    const ker = analysis.tradeSetup.ker || analysis.ker;
    const vpci = analysis.tradeSetup.vpci || analysis.vpci;
    const mcginley = analysis.tradeSetup.mcginley || analysis.mcginley;
    const elderForce = analysis.tradeSetup.elderForce || analysis.elderForce;
    const rvi = analysis.tradeSetup.rvi || analysis.rvi;
    const frama = analysis.tradeSetup.frama || analysis.frama;
    const m75 = analysis.tradeSetup.milestone75 || analysis.milestone75;
    const obi = analysis.tradeSetup.orderBookImbalance || analysis.orderBookImbalance;
    const vwapBands = analysis.tradeSetup.vwapVarianceBands || analysis.vwapVarianceBands;
    const volVel = analysis.tradeSetup.volumeVelocity || analysis.volumeVelocity;
    const iceberg = analysis.tradeSetup.icebergOrders || analysis.icebergOrders;
    const liqMatrix = analysis.tradeSetup.liquidityMatrix || analysis.liquidityMatrix;
    const advCVD = analysis.tradeSetup.advancedCVD || analysis.advancedCVD;
    const fpCluster = analysis.tradeSetup.footprintCluster || analysis.footprintCluster;
    const vpin = analysis.tradeSetup.vpinToxicity || analysis.vpinToxicity;
    const vacuum = analysis.tradeSetup.liquidityVacuum || analysis.liquidityVacuum;
    const ofFusion = analysis.tradeSetup.orderFlowFusion || analysis.orderFlowFusion;
    const kyles = analysis.tradeSetup.kylesLambda || analysis.kylesLambda;
    const tSize = analysis.tradeSetup.tradeSizeDistribution || analysis.tradeSizeDistribution;
    const uPrice = analysis.tradeSetup.microPrice || analysis.microPrice;
    const advSel = analysis.tradeSetup.adverseSelection || analysis.adverseSelection;
    const execEng = analysis.tradeSetup.executionEngine || analysis.executionEngine;
    const leadLag = analysis.tradeSetup.crossMarketLeadLag || analysis.crossMarketLeadLag;
    const liqRepl = analysis.tradeSetup.liquidityReplenishment || analysis.liquidityReplenishment;
    const permImpact = analysis.tradeSetup.permanentPriceImpact || analysis.permanentPriceImpact;
    const algoFoot = analysis.tradeSetup.algoExecutionFootprint || analysis.algoExecutionFootprint;
    const execAlpha = analysis.tradeSetup.executionAlpha || analysis.executionAlpha;
    const quantum = analysis.tradeSetup.quantumProbabilityVector || analysis.quantumProbabilityVector;
    const mfHurst = analysis.tradeSetup.multiFractalHurst || analysis.multiFractalHurst;
    const fillSlip = analysis.tradeSetup.fillProbabilitySlippage || analysis.fillProbabilitySlippage;
    const dpGamma = analysis.tradeSetup.darkPoolDealerGamma || analysis.darkPoolDealerGamma;
    const sovAlpha = analysis.tradeSetup.sovereignSingularityAlpha || analysis.sovereignSingularityAlpha;
    const iq = (analysis as any)?.institutionalQuant;

    const text = `📊 [INSTITUTIONAL QUANT PLAN: ${analysis.symbol} (${analysis.timeframe.toUpperCase()})]\n` +
      `• Signal: ${analysis.signal} (Grade: ${analysis.setupGrade || "A"}, Confluence: ${mc?.totalScore || analysis.confidence}%)\n` +
      `• Calendar Shield: ${cal?.badgeText || "SAFE"} (${cal?.freezeReason || "ปกติ"})\n` +
      `• Session Timing: ${sess?.sessionBadge.text || "NORMAL"} (${sess?.thaiTimeStr || ""})\n` +
      `• Market Regime: ${reg?.title || "NORMAL"}\n` +
      `• OTE Golden Pocket: ${analysis.tradeSetup.entryZone.min} - ${analysis.tradeSetup.entryZone.max} (Sweet Spot: ${analysis.tradeSetup.pendingPrice})\n` +
      (sovAlpha ? `• 🌌 Grand Milestone 100 Sovereign Singularity: [${sovAlpha.milestone100Grade}] Score ${sovAlpha.sovereignAlphaScore}/100 (Convergence: ${sovAlpha.singularityState} | Rec: ${sovAlpha.singularityRecommendation} | Lock 23: ${sovAlpha.safetyLock23Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (quantum ? `• 🔮 Quantum Probability: |Up⟩ ${(quantum.stateVector.psiUp * 100).toFixed(0)}% vs |Down⟩ ${(quantum.stateVector.psiDown * 100).toFixed(0)}% (Entropy: ${quantum.shannonVonNeumannEntropy} bits | Coherence: ${quantum.quantumCoherenceScore}/100 - ${quantum.collapseState})\n` : "") +
      (mfHurst ? `• 🧬 Multi-Fractal Cascades: [${mfHurst.cascadePersistenceState}] H(2): ${mfHurst.generalizedHurstQ2} (Singularity Δα: ${mfHurst.singularitySpectrumWidth} | Confluence: ${mfHurst.timeframeCascadesConfluencePct}%)\n` : "") +
      (fillSlip ? `• 🎯 Fill Probability & Slippage: [${fillSlip.fillEfficiencyGrade}] Slippage: ~${fillSlip.forecastedSlippagePips} pips (Limit Fill: ${fillSlip.limitFillProbabilityPct}% | Style: ${fillSlip.recommendedExecutionStyle})\n` : "") +
      (dpGamma ? `• 🌊 Dark Pool Dealer Gamma: [${dpGamma.gammaRegime}] GEX: ${dpGamma.netDealerGammaExposureScore} (Flip: ${dpGamma.syntheticGammaFlipLevel} | Pin: ${dpGamma.estimatedPinningStrike} | Index: ${dpGamma.darkPoolHiddenInventoryIndex}/100)\n` : "") +
      (leadLag ? `• 🌐 Cross-Market Lead-Lag: [${leadLag.leadState}] (Lag: ${leadLag.leadLagLagPeriods} bars | r: ${leadLag.leadCorrelationCoefficient} | Lead: +${leadLag.predictiveLeadPips} pips)\n` : "") +
      (liqRepl ? `• ⚡ Liquidity Replenishment: [${liqRepl.liquidityStickiness}] Velocity: ${liqRepl.replenishmentVelocityScore}/100 (Cancel: ${liqRepl.cancellationRatePct}% | Half-life: ${liqRepl.replenishmentHalfLifeSeconds}s)\n` : "") +
      (permImpact ? `• 🏛️ Hasbrouck Permanent Impact: [${permImpact.priceDiscoveryRegime}] (Permanent: ${(permImpact.permanentImpactRatio * 100).toFixed(0)}% | Informed: ${permImpact.informationAsymmetryPct}% - Reversion: ${permImpact.transitoryReversionPips} pips)\n` : "") +
      (algoFoot ? `• 🤖 Algorithmic Footprint: [${algoFoot.algoType}] (Bias: ${algoFoot.institutionalExecutionBias} | Cadence: ${algoFoot.cadenceRegularityScore}/100 | Remaining: ~${algoFoot.estimatedRemainingBars} bars)\n` : "") +
      (execAlpha ? `• 🏆 Grand Milestone 95 Execution Alpha: [${execAlpha.milestone95Grade}] Score ${execAlpha.executionAlphaScore}/100 (Rec: ${execAlpha.executionAlphaRecommendation} | Lock 22: ${execAlpha.safetyLock22Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (kyles ? `• 📐 Kyle's Lambda Impact: λ ${kyles.lambda} (${kyles.fragilityState} | Impact: ${kyles.priceImpactPipsPerMillion} pips/$1M - Fragility: ${kyles.marketFragilityScore}/100)\n` : "") +
      (tSize ? `• 🐋 Trade Size Distribution: Dominance ${tSize.institutionalDominanceRatio}x (${tSize.dominantParticipant} | Whale: ${tSize.sovereignWhaleSharePct}% - Block: ${tSize.institutionalBlockSharePct}%)\n` : "") +
      (uPrice ? `• ⏱️ Stoikov Micro-Price: ${uPrice.microPrice} (Dev: ${uPrice.microPriceDeviationPips} pips | ${uPrice.tickLeadSignal} - ${uPrice.subSpreadMomentum})\n` : "") +
      (advSel ? `• ⚠️ Adverse Selection Hazard: [${advSel.hazardState}] Winner's Curse: ${advSel.winnersCurseProbabilityPct}% (Drift: ${advSel.adverseDriftPips} pips | ${advSel.recommendedExecutionStyle})\n` : "") +
      (execEng ? `• 🏆 Grand Milestone 90 Execution Engine: [${execEng.milestone90Grade}] Score ${execEng.executionEfficiencyScore}/100 (Status: ${execEng.executionReadiness} | Lock 21: ${execEng.safetyLock21Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (advCVD ? `• 🌊 Advanced CVD Flow: ${advCVD.currentCVD} (Div: ${advCVD.divergenceType} | Flow: ${advCVD.dominantFlow})\n` : "") +
      (fpCluster ? `• 👣 Footprint Cluster: Delta ${fpCluster.deltaAtExtremes} (BidVol: ${fpCluster.lowWickBidVolume} vs AskVol: ${fpCluster.highWickAskVolume} | Side: ${fpCluster.clusterAbsorptionSide})\n` : "") +
      (vpin ? `• 🧪 VPIN Flow Toxicity: ${vpin.vpin} (Regime: ${vpin.toxicityRegime} | Informed Trading: ${vpin.informedTradingProbabilityPct}%)\n` : "") +
      (vacuum && vacuum.isVacuumDetected ? `• 🕳️ Liquidity Vacuum: DETECTED (${vacuum.vacuumType} | Gap ${vacuum.thinDepthGapSizePips} pips)\n` : "") +
      (ofFusion ? `• 🏆 Grand Milestone 85 Order Flow Fusion: [${ofFusion.milestone85Grade}] Score ${ofFusion.orderFlowScore}/100 (Dominance: ${ofFusion.flowDominance} | Lock 20: ${ofFusion.safetyLock20Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (obi ? `• 🌊 Order Book Imbalance: OBI ${obi.imbalanceRatio.toFixed(2)} (${obi.pressureState} | Bid: ${obi.bidDepthPct}% vs Ask: ${obi.askDepthPct}%)\n` : "") +
      (vwapBands ? `• 🎯 VWAP Variance Envelopes: VWAP ${vwapBands.vwap} (Pos: ${vwapBands.bandPosition} | Reversion: ${vwapBands.isMeanReversionZone ? "ACTIVE" : "NO"})\n` : "") +
      (volVel ? `• ⚡ Volume Velocity: ${volVel.velocityRatio}x | Accel ${volVel.accelerationRatio}x (${volVel.burstDirection} | Climax: ${volVel.isVolumeClimax ? "YES" : "NO"})\n` : "") +
      (iceberg && iceberg.isIcebergDetected ? `• 🧊 Iceberg Order: DETECTED (${iceberg.icebergSide} @ ${iceberg.icebergPrice} | Anomaly: ${iceberg.anomalyRatio}x)\n` : "") +
      (liqMatrix ? `• 🏆 Institutional Liquidity Matrix: [${liqMatrix.liquidityState}] Score ${liqMatrix.liquidityScore}/100 (Lock 19: ${liqMatrix.safetyLock19Passed ? "PASSED" : "BLOCKED"} | Phase 4: ${liqMatrix.phase4Readiness})\n` : "") +
      (mcginley ? `• 📈 McGinley Dynamic: MD ${mcginley.mcginley} (${mcginley.trendState} | Dev: ${mcginley.deviationPips} pips)\n` : "") +
      (elderForce ? `• ⚡ Elder Force Index: EFI(2) ${elderForce.efiShort} | EFI(13) ${elderForce.efiLong} (${elderForce.forceState} - ${elderForce.efiTrend})\n` : "") +
      (rvi ? `• 🌪️ Relative Volatility Index: RVI ${rvi.rvi} (${rvi.rviSignal} | ${rvi.volatilityDirection})\n` : "") +
      (frama ? `• 🌀 FRAMA Fractal MA: ${frama.frama} (D=${frama.fractalDimension} | Alpha: ${frama.alpha} | ${frama.state})\n` : "") +
      (m75 ? `• 🏆 Grand Milestone 75 Quant Fusion: [${m75.milestoneGrade}] Score ${m75.quantScore}/100 - ${m75.phase3DominanceStatus} (Lock 18: ${m75.safetyLock18Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (keltner ? `• 🗂️ Keltner Bands: %B ${keltner.percentB}% | BW ${keltner.bandwidth}% (${keltner.isExpanding ? "EXPANDING" : "CONTRACTING"})\n` : "") +
      (donchian ? `• 🐢 Donchian Turtle Breakout: ${donchian.breakoutState} (Width: ${donchian.channelWidth})\n` : "") +
      (cvol ? `• 📊 Chaikin Volatility: CVOL ${cvol.cvol}% (${cvol.volatilityTrend})\n` : "") +
      (ker ? `• 🎯 Kaufman KER Ratio: ${ker.efficiencyRatio} (Score: ${ker.noiseDecouplingScore} | ${ker.regime})\n` : "") +
      (vpci ? `• ⛽ VPCI Volume Energy Shield: VPCI ${vpci.vpci} (Signal: ${vpci.vpciSignal} | ${vpci.volumeEnergyState} | Lock 17: ${vpci.safetyLock17Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (fisher ? `• 🔮 Fisher Transform: ${fisher.fisher} (Trigger: ${fisher.trigger} | Cross: ${fisher.crossSignal})\n` : "") +
      (crsi ? `• 🎯 ConnorsRSI: ${crsi.crsi} (RSI3: ${crsi.rsiClose} | StreakRSI: ${crsi.streakRSI} | Rank: ${crsi.percentRank}%)\n` : "") +
      (ao ? `• ⚡ Awesome Oscillator: ${ao.ao} (${ao.isGreen ? "GREEN" : "RED"} | Saucer: ${ao.saucerSignal})\n` : "") +
      (tsi ? `• 🌊 True Strength Index: ${tsi.tsi} (Signal: ${tsi.signal} | ${tsi.isBullish ? "BULLISH" : "BEARISH"})\n` : "") +
      (advVol ? `• 🌪️ Advanced Vol Suite: YZ ${(advVol.yangZhangVol * 100).toFixed(1)}% | GK ${(advVol.garmanKlassVol * 100).toFixed(1)}% | Ulcer ${advVol.ulcerIndex} (Lock 16: ${advVol.safetyLock16Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (kama ? `• 🎛️ KAMA Adaptive: ${kama.kamaValue} (ER: ${(kama.efficiencyRatio * 100).toFixed(1)}% | ${kama.trendState})\n` : "") +
      (hma ? `• ⚡ HMA Zero-Lag: ${hma.hmaValue} (${hma.isTurningUp ? "TURNING_UP" : hma.isTurningDown ? "TURNING_DOWN" : "STEADY"})\n` : "") +
      (sar ? `• 🎯 Parabolic SAR: ${sar.sar} (${sar.isBullish ? "BULLISH" : "BEARISH"} | Reversal: ${sar.isReversal ? "FLIP" : "NO"})\n` : "") +
      (aroon ? `• ⏳ Aroon Cycle: Up ${aroon.aroonUp}% / Down ${aroon.aroonDown}% (Osc: ${aroon.oscillator} | ${aroon.trendState})\n` : "") +
      (vortex ? `• 🌀 Vortex Flow: VI+ ${vortex.viPlus} vs VI- ${vortex.viMinus} (${vortex.trend} | Lock 15: ${vortex.safetyLock15Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (hurst ? `• 🧬 Hurst Exponent: ${hurst.hurst} (${hurst.marketCharacter} | ความเชื่อมั่น ${hurst.confidence}%)\n` : "") +
      (kalman ? `• 🎯 Kalman Filter Latent State: ${kalman.filteredPrice} (Error: ±${kalman.estimationError} | Bias: ${kalman.trendBias || "EQUILIBRIUM"})\n` : "") +
      (hl ? `• ⏱️ OU Half-Life Reversion: ${hl.halfLifeCandles} bars (${hl.reversionVelocity})\n` : "") +
      (ttm ? `• 🗜️ TTM Squeeze: ${ttm.isSqueezeOn ? "SQUEEZE ON" : ttm.squeezeFired ? "SQUEEZE FIRED" : "NORMAL"} (${ttm.momentumDirection} | Momentum: ${ttm.momentum})\n` : "") +
      (cmf ? `• 🌊 Chaikin Money Flow: ${cmf.cmf} (${cmf.capitalFlow} | Safety Lock 14: ${cmf.safetyLock14Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (harm && harm.hasPattern && harm.bestPattern ? `• 📐 Harmonic Pattern: ${harm.bestPattern.patternName} (${harm.bestPattern.type}) | PRZ: ${harm.bestPattern.prz.min}-${harm.bestPattern.prz.max} | TP1: ${harm.bestPattern.targetTP1}\n` : "") +
      (mesa ? `• 📡 Ehlers MESA DSP: ${mesa.cycleState} (Dominant Period: ${mesa.dominantCyclePeriod} bars | Phase: ${mesa.phaseAngle}°)\n` : "") +
      (ent ? `• 🎲 Shannon Entropy: ${ent.normalizedEntropy} (${ent.orderliness} | Noise: ${ent.noisePct}% | Lock 13: ${ent.safetyLock13Passed ? "PASSED" : "BLOCKED"})\n` : "") +
      (cs && cs.detectedPatterns && cs.detectedPatterns.length > 0 ? `• 🕯️ Candlestick Matrix: ${cs.dominantSignal} (${cs.detectedPatterns.map(m => m.pattern).join(", ")})\n` : "") +
      (m50 ? `• 🏛️ Milestone 50 Golden Ticket: [${m50.milestoneGrade}] Score ${m50.milestoneScore}/100 - ${m50.goldenTicketStatus} (ผ่าน ${m50.activePillarsCount}/13 เสาหลัก, ${m50.safetyLocksPassedCount}/13 Safety Locks)\n` : "") +
      (fvg && fvg.recommendedEntryLimit ? `• FVG C.E. 50%: ${fvg.recommendedEntryLimit} (${fvg.bias} | Unmitigated: ${fvg.unmitigatedCount})\n` : "") +
      (mss && mss.detected ? `• Market Structure Shift: ${mss.type} (Displacement: ${mss.displacementMultiplier}x ATR - ${mss.displacementVelocity})\n` : "") +
      (pd ? `• Premium/Discount: ${pd.percentile}% (${pd.zone} | Equilibrium: ${pd.equilibrium})\n` : "") +
      (key ? `• Key Liquidity Target: ${key.nearestLiquidityTarget.name} (${key.nearestLiquidityTarget.price} - ${key.nearestLiquidityTarget.distancePips} pips)\n` : "") +
      (flow ? `• Order Flow Velocity: Score ${flow.velocityScore} (${flow.momentumState})\n` : "") +
      (beLadder ? `• Multi-Stage BE Ladder: ขั้นที่ ${beLadder.currentStage}/3 (${beLadder.actionAdvice} | Rec SL: ${beLadder.recommendedSL})\n` : "") +
      (lVoid && lVoid.activeVoidCount > 0 ? `• Liquidity Void: ${lVoid.vacuumDirection} (${lVoid.activeVoidCount} จุด, เติม 50% ที่ ${lVoid.nearestVoid?.fillTarget50} - ความน่าจะเป็น ${lVoid.fastFillProbabilityPct}%)\n` : "") +
      (fibExt && fibExt.bestTakeProfitTarget ? `• Fib Extension Mesh: 1.618 Golden Target ${fibExt.bestTakeProfitTarget.price} (${fibExt.bestTakeProfitTarget.label})\n` : "") +
      (vsa ? `• VSA Footprint: ${vsa.vsaSignal} (Effort/Result: ${vsa.effortVsResult} | Vol: ${vsa.relativeVolume}x)\n` : "") +
      (mtf ? `• MTF Structure Matrix: ${mtf.overallAlignment} (สอดคล้อง ${mtf.alignmentScorePct}% | HTF: ${mtf.htfTrend})\n` : "") +
      (idm && idm.isInducementTrap ? `• 🪤 Inducement Trap Alert: ${idm.trapType} (${idm.inducementDirection} - ห่าง ${idm.distanceToTrapPips} pips)\n` : "") +
      (chos ? `• 🚀 ChoS Delivery: ${chos.deliveryState} (${chos.dominantParticipant} | Score: ${chos.deliveryScore}/100)\n` : "") +
      (drb ? `• 🛡️ Dynamic Risk Bracket: [${drb.currentRiskBracket}] แนะนำเสี่ยง ${drb.recommendedRiskPct}% (Throttle: ${drb.drawdownThrottleMultiplier}x)\n` : "") +
      (rej && rej.blocks.length > 0 ? `• 🧱 Rejection Blocks: พบ ${rej.blocks.length} บล็อค (Wick Ratio: ${rej.rejectionWickRatioPct}% | Exhaustion: ${rej.wickExhaustionScore}/100)\n` : "") +
      (mcpi ? `• ⚡ Unified MCPI Conviction: ${mcpi.score}/100 [เกรด ${mcpi.convictionTier}] (${mcpi.isApprovedForExecution ? "APPROVED" : "BLOCKED"})\n` : "") +
      (vp ? `• Volume Profile Value Area: ${vp.val} - ${vp.vah} (POC: ${vp.poc})\n` : "") +
      (vwap ? `• Anchored VWAP: ${vwap.vwap} (Pos: ${vwap.pricePosition} | ±2σ: ${vwap.lowerBand2}-${vwap.upperBand2})\n` : "") +
      (cvd ? `• CVD Flow: ${cvd.cvdTrend} (${cvd.divergence !== "NONE" ? cvd.divergence : `Buyer ${cvd.buyerVolumeRatio}%`})\n` : "") +
      (ob && ob.nearestBlock ? `• SMC Block: ${ob.nearestBlock.type} (${ob.nearestBlock.priceMin}-${ob.nearestBlock.priceMax})\n` : "") +
      (swp && swp.sweepType !== "NONE" ? `• Liquidity Sweep: ${swp.sweepType} (${swp.sweptLevel ? `Level ${swp.sweptLevel} | ${swp.sweptSession} (+${swp.sweepDistancePips} pips)` : ""})\n` : "") +
      (fib ? `• Fibonacci Clusters: ${fib.confluenceCount} Levels (${fib.clusterZone.min}-${fib.clusterZone.max})\n` : "") +
      (rv ? `• Realized Volatility: ${rv.volState} (${rv.realizedVol}%, Buffer ${rv.recommendedBufferMultiplier}x)\n` : "") +
      (micro ? `• Microstructure: ${micro.rejectionStrength} (Wick: ${micro.wickRatio}%)\n` : "") +
      (shield ? `• Macro Correlation Shield: ${shield.macroRegime} (${shield.shieldStatus})\n` : "") +
      `• Stop Loss: ${analysis.tradeSetup.stopLoss} (${analysis.tradeSetup.slPips || 0} Pips ${ssl ? `| ${ssl.protectionType}` : ""})\n` +
      `• Take Profit 1: ${analysis.tradeSetup.takeProfit1} (+${analysis.tradeSetup.tp1Pips || 0} Pips | Breakeven Point)\n` +
      `• Take Profit 2: ${analysis.tradeSetup.takeProfit2} (+${analysis.tradeSetup.tp2Pips || 0} Pips | Trend Runner)\n` +
      `• R:R: ${analysis.tradeSetup.riskRewardRatio}\n` +
      (kelly ? `• Kelly Sizing: Half-Kelly ${kelly.halfKellyPct}% (แนะนำเสี่ยง ${kelly.volatilityAdjustedPct}% ต่อไม้)\n` : "") +
      (be ? `• Breakeven Shield (+1.0R): ${be.actionText}\n` : "") +
      (ts ? `• Chandelier Trailing Stop: ${ts.trailingStopPrice}\n` : "") +
      (sp ? `• Broker Spread Impact: ~${sp.estimatedSpreadPips} pips (Net R:R: ${sp.effectiveRiskReward})\n` : "") +
      (td && td.isExhausted ? `• Exhaustion Warning: ${td.note}\n` : "") +
      (vd ? `• Volume Delta: ซื้อ ${vd.buyerVolumePct}% vs ขาย ${vd.sellerVolumePct}% (${vd.dominantSide})\n` : "") +
      (iq ? `• 🧠 5-Layer Quant: ML ${iq.layer3Brain.mlDirection} (${iq.layer3Brain.probabilities.buy}% Buy / ${iq.layer3Brain.probabilities.sell}% Sell) | Strategy: ${iq.layer3Brain.adaptiveStrategy.strategyMode} | WFE: ${iq.layer5Validation.walkForwardEfficiency}%\n` : "") +
      `• Invalidation: ${analysis.tradeSetup.invalidationNote}`;
    copyToClipboard(text, "full_plan");
  };

  if (isLoading) {
    return (
      <div className="bg-surface-100 border border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[480px] text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center shadow-xl shadow-blue-500/20 animate-pulse">
            <Sparkles className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-bold text-white mt-4">Scanning Economic Calendar & Market Sessions...</h3>
        <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
          ตรวจจับข่าวกล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ ตรวจเช็คเวลาห้ามเทรด (Freeze Shield) และ Golden Hours...
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-surface-100 border border-slate-800 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-12 h-12 rounded-xl bg-surface-50 border border-slate-800 flex items-center justify-center text-indigo-400 mb-3">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-sm font-semibold text-white">กำลังรอผลวิเคราะห์ AI หรือเริ่มต้นการวิเคราะห์ใหม่</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          ระบบกำลังเชื่อมต่อและประมวลผล หรือกดปุ่ม <strong>AI Synthesize</strong> ด้านบนเพื่อประมวลผลใหม่ทันที
        </p>
      </div>
    );
  }

  const getSignalBadge = (signal: AnalysisResult["signal"]) => {
    switch (signal) {
      case "STRONG_BUY":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          label: "STRONG BUY",
          glow: "glow-green",
        };
      case "BUY":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          label: "BUY",
          glow: "",
        };
      case "STRONG_SELL":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          label: "STRONG SELL",
          glow: "glow-red",
        };
      case "SELL":
        return {
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          label: "SELL",
          glow: "",
        };
      default:
        return {
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          label: "WAIT / NEUTRAL",
          glow: "",
        };
    }
  };

  const getGradeBadge = (grade?: string) => {
    const g = grade || "B";
    if (g.includes("A+")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (g.includes("A")) return "bg-teal-500/20 text-teal-300 border-teal-500/30";
    if (g.includes("B")) return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    return "bg-slate-700/50 text-slate-300 border-slate-600";
  };

  const signalConfig = getSignalBadge(analysis.signal);
  const backtest = analysis.historicalBacktest;
  const opt = analysis.optimizedConfig;
  const mc = analysis.masterConfluence;
  const reg = analysis.regimeInfo;
  const sess = analysis.sessionStatus;
  const cal = analysis.calendarSafety;
  const iq = analysis.institutionalQuant;

  return (
    <div className="bg-surface-100 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* 1. Header Signal & Actions Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-sm font-black tracking-wide ${signalConfig.bg} ${signalConfig.glow}`}>
            {signalConfig.label}
          </div>

          {/* Setup Grade */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold ${getGradeBadge(analysis.setupGrade)}`}>
            <Award className="w-3.5 h-3.5" />
            <span>Grade: {analysis.setupGrade || "A"} Setup</span>
          </div>

          {/* Analysis Timestamp */}
          {analysis.timestamp && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 border border-slate-700/80 text-xs font-mono text-slate-300"
              title="เวลาที่ระบบรันการสังเคราะห์ AI ล่าสุด"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                วิเคราะห์เมื่อ: {new Date(analysis.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          )}

          {/* Confluence Score Gauge */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Master Confluence Score</span>
              <span className="text-xs font-mono font-bold text-white">{mc?.totalScore || analysis.confidence}%</span>
            </div>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (mc?.totalScore || analysis.confidence) >= 85
                    ? "bg-emerald-400"
                    : (mc?.totalScore || analysis.confidence) >= 70
                    ? "bg-teal-400"
                    : (mc?.totalScore || analysis.confidence) >= 55
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
                style={{ width: `${mc?.totalScore || analysis.confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyFullPlan}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95"
            title="Copy MT4/MT5 trade setup to clipboard"
          >
            {copiedKey === "full_plan" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy MT4/5 Plan</span>
              </>
            )}
          </button>

          <button
            onClick={onSendTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingTelegram ? "animate-spin" : ""}`} />
            <span>{isSendingTelegram ? "Sending..." : "Send to Telegram Bot"}</span>
          </button>
        </div>
      </div>

      {/* 🌟 2. HERO TRADE EXECUTION COCKPIT (แผงควบคุมการเข้าเทรดเด่นชัดที่สุด - สะดุดตาทันที) */}
      <HeroExecutionHUD
        analysis={analysis}
        copiedKey={copiedKey}
        onCopy={copyToClipboard}
        customBalance={customBalance}
        setCustomBalance={setCustomBalance}
        customRiskPct={customRiskPct}
        setCustomRiskPct={setCustomRiskPct}
        accountType={accountType}
        setAccountType={setAccountType}
      />

      {/* ─── 3. MODULAR WORKSPACE TABS (บีบรวม UI ให้กระชับ ไม่รก ทำงานเบื้องหลัง) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCardTab("STRATEGY")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCardTab === "STRATEGY"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "bg-surface-50 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>กลยุทธ์ & เกราะป้องกันข่าว (Strategy & Shield)</span>
          </button>

          <button
            onClick={() => setActiveCardTab("DEEP_QUANT")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCardTab === "DEEP_QUANT"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                : "bg-surface-50 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>คลังอินดิเคเตอร์ 100 ตัวเชิงลึก (Deep Quant Lab - Milestone 100 Complete)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
              รันในพื้นหลัง
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden md:inline font-medium">
          {activeCardTab === "STRATEGY"
            ? "🛡️ คัดกรองกลยุทธ์ & ป้องกันสัญญาณตีกัน"
            : "⚡ คำนวณเบื้องหลัง 100 เครื่องมือแบบเรียลไทม์ (100% Roadmap Complete)"}
        </span>
      </div>

      {/* ─── TAB 1: STRATEGY & MACRO SHIELD ─── */}
      {activeCardTab === "STRATEGY" && (
        <div className="space-y-5 animate-fadeIn">
          {/* 🛡️ ANTI-CLASH STRATEGY ORCHESTRATOR & PERSONA SELECTOR */}
          {analysis.orchestrator && (
            <StrategyPersonaSelector orchestrator={analysis.orchestrator} />
          )}

      {/* 2. 📅 ECONOMIC CALENDAR & RED FOLDER SHIELD (กล่องแดง เหลือง เทา) */}
      {cal && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/20 via-surface-50 to-slate-900 border border-rose-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Economic Calendar & News Shield</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cal.badgeColor}`}>
                    {cal.badgeText}
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">วิเคราะห์ข่าวกล่องแดง 🔴 ส้ม 🟠 เหลือง 🟡 เทา ⚪ สั่งหยุดเทรดอัตโนมัติก่อน-หลังข่าว</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPlaybookGuide(!showPlaybookGuide)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-amber-300 transition-all active:scale-95"
              >
                <BookOpen className="w-3 h-3 text-amber-400" />
                <span>คู่มือ 4 กล่องข่าว</span>
                {showPlaybookGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                cal.tradeAllowed
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
              }`}>
                {cal.tradeAllowed ? "✅ ระบบอนุญาตให้เทรด" : "⛔ สั่งระงับการเทรด (FREEZE)"}
              </span>
            </div>
          </div>

          {/* Expandable 4-Box Playbook Guide */}
          {showPlaybookGuide && (
            <div className="p-3.5 rounded-xl bg-surface-100/95 border border-slate-700 space-y-2.5 text-xs">
              <h6 className="font-bold text-white text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>📖 คู่มือการเทรดรับมือ 4 กล่องข่าวเศรษฐกิจ (ฉบับมือใหม่เข้าใจง่ายทันที)</span>
              </h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-500/30 space-y-1">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <span>🟥</span> 1. กล่องสีแดง (High Impact) — อันตรายรุนแรงสูงสุด
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>ข่าวระดับโลก:</strong> เงินเฟ้อสหรัฐฯ (CPI), การจ้างงาน (NFP), แถลงดอกเบี้ยเฟด (Fed)
                  </p>
                  <p className="text-rose-200/90 text-[10px] leading-relaxed bg-rose-950/40 p-1.5 rounded border border-rose-500/20">
                    👉 <strong>สำหรับมือใหม่:</strong> กราฟสามารถสะบัดขึ้นลงแรงเป็นพันจุดในพริบตา ระบบจะล็อกเป็น <strong>WAIT</strong> อัตโนมัติ เพื่อไม่ให้คุณเผลอเปิดออเดอร์แล้วพอร์ตแตก ควรนั่งดูเฉยๆ รอให้ข่าวออกไปแล้ว 15 นาทีจนตลาดนิ่ง
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <span>🟧</span> 2. กล่องสีส้ม (Medium Impact) — ผันผวนปานกลาง
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>ข่าวตัวเลขทั่วไป:</strong> ดัชนีความเชื่อมั่นโรงงาน (PMI), ยอดค้าปลีก (Retail Sales)
                  </p>
                  <p className="text-amber-200/90 text-[10px] leading-relaxed bg-amber-950/40 p-1.5 rounded border border-amber-500/20">
                    👉 <strong>สำหรับมือใหม่:</strong> กราฟจะวิ่งไปตามทิศทางตัวเลขอย่างมีเหตุผล ไม่กระชากมั่วซั่ว สามารถเปิดออเดอร์ตามแนวโน้มเดิมได้สบายใจ แต่ต้องตั้งจุดยอมแพ้ (Stop Loss) ทุกครั้ง
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-yellow-950/25 border border-yellow-500/30 space-y-1">
                  <span className="font-bold text-yellow-400 flex items-center gap-1">
                    <span>🟨</span> 3. กล่องสีเหลือง (Low Impact) — ผันผวนต่ำ (ปลอดภัยสุด)
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>ข่าวระดับย่อย:</strong> สถิติประจำวัน, รายงานการค้าทั่วไป
                  </p>
                  <p className="text-yellow-200/90 text-[10px] leading-relaxed bg-yellow-950/40 p-1.5 rounded border border-yellow-500/20">
                    👉 <strong>สำหรับมือใหม่:</strong> สวรรค์ของคนเทรด! กราฟจะเคารพแนวรับแนวต้านอย่างแม่นยำ เหมาะที่สุดสำหรับมือใหม่ในการฝึกเทรดและเก็บกำไรตามระบบ
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <span>⬜️</span> 4. กล่องสีเทา/ขาว (Bank Holiday) — วันหยุดตลาด
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>วันหยุดราชการ:</strong> ธนาคารใหญ่ในสหรัฐฯ หรือยุโรปปิดทำการ
                  </p>
                  <p className="text-slate-300 text-[10px] leading-relaxed bg-slate-800/80 p-1.5 rounded border border-slate-700">
                    👉 <strong>สำหรับมือใหม่:</strong> ไม่มีคนซื้อขาย วอลุ่มจะแห้งสนิท กราฟจะแทบไม่ขยับ และค่าธรรมเนียม (Spread) อาจถ่างกว้าง แนะนำให้ปิดหน้าจอพักผ่อน ถือเงินสดไว้สบายใจที่สุด
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Callout Notice */}
          <div className={`p-2.5 rounded-lg text-[11px] border leading-relaxed ${
            cal.tradeAllowed
              ? "bg-surface-100/80 border-slate-800 text-slate-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}>
            <span className="font-semibold">{cal.tradeAllowed ? "🛡️ สถานะความปลอดภัย:" : "⚠️ ประกาศเตือนด่วน:"}</span> {cal.freezeReason}
          </div>

          {/* Upcoming Economic Events Today */}
          {cal.relevantEvents && cal.relevantEvents.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-slate-400 block">ข่าวเศรษฐกิจวันนี้ที่มีผลต่อ {analysis.symbol}:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cal.relevantEvents.slice(0, 4).map((evt) => {
                  const getImpactBadge = (impact: string) => {
                    switch (impact) {
                      case "HIGH":
                        return { bg: "bg-rose-500/20 text-rose-400 border-rose-500/40", icon: "🔴", label: "กล่องแดง (High)" };
                      case "MEDIUM":
                        return { bg: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: "🟠", label: "กล่องส้ม (Med)" };
                      case "LOW":
                        return { bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: "🟡", label: "กล่องเหลือง (Low)" };
                      default:
                        return { bg: "bg-slate-700 text-slate-300 border-slate-600", icon: "⚪", label: "วันหยุด (Holiday)" };
                    }
                  };
                  const badge = getImpactBadge(evt.impact);

                  return (
                    <div
                      key={evt.id}
                      className="p-2 rounded-lg bg-surface-100/70 border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px]">{badge.icon}</span>
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{evt.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            เวลา {evt.timeStr} • {evt.currency}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-[10px] font-mono">
                        <span className="text-slate-400 block">Exp: {evt.forecast}</span>
                        <span className="text-slate-500 block">Prev: {evt.previous}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ⏰ LIVE TRADING SESSION & GOLDEN HOURS RADAR */}
      {sess && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/20 via-surface-50 to-indigo-950/30 border border-amber-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Clock3 className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Live Trading Session Clock</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 border border-slate-700 text-amber-300">
                    เวลาไทย (GMT+7): {sess.thaiTimeStr}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sess.sessionBadge.color}`}>
                    {sess.sessionBadge.text}
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">วิเคราะห์พฤติกรรมวอลุ่ม สเปรด และช่วงเวลาทำกำไรเฉพาะของ {analysis.symbol}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                sess.spreadStatus === "TIGHT"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : sess.spreadStatus === "WIDE_DANGER"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-surface-100 text-slate-300 border-slate-700"
              }`}>
                {sess.spreadStatus === "TIGHT" ? "🟢 สเปรดต่ำสุด (Optimal)" : sess.spreadStatus === "WIDE_DANGER" ? "🔴 ระวังสเปรดถ่าง (Danger)" : "⚪ สเปรดปกติ"}
              </span>
            </div>
          </div>

          {/* Active Global Sessions Pill List */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold mr-1">ตลาดที่เปิดอยู่:</span>
            {["Sydney", "Tokyo", "London", "New York"].map((sName) => {
              const isOpen = sess.activeSessions.includes(sName);
              return (
                <div
                  key={sName}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isOpen
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-surface-100/60 text-slate-500 border-slate-800"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`}></span>
                  <span>{sName}</span>
                </div>
              );
            })}
          </div>

          {/* Tactical Advice Callout */}
          <div className="p-2.5 rounded-lg bg-surface-100/70 border border-slate-800 text-[11px] text-slate-200 flex items-start gap-2">
            <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed"><strong>คำแนะนำตามช่วงเวลา:</strong> {sess.assetSessionAdvice}</span>
          </div>
        </div>
      )}

      {/* 4. 🧠 LIVE MARKET REGIME & MOMENTUM RADAR */}
      {reg && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Dynamic Live Market Regime</span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${reg.badgeColor}`}>
                    {reg.title}
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">{reg.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">เป้า Win Rate สภาวะนี้:</span>
              <strong className="text-emerald-400">{reg.targetedWinRate}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ADX Strength</span>
              <span className={`text-xs font-mono font-bold ${reg.adxValue >= 24 ? "text-emerald-400" : "text-amber-400"}`}>
                {reg.adxValue} ({reg.adxValue >= 24 ? "Trending" : "Ranging"})
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Bollinger Width</span>
              <span className="text-xs font-mono font-bold text-sky-400">
                {reg.bandwidthValue}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Adaptive Ribbon</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                EMA {reg.optimalParams.emaFast}/{reg.optimalParams.emaSlow}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-surface-50/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Optimal R:R Ratio</span>
              <span className="text-xs font-mono font-bold text-emerald-300">
                1 : {reg.optimalParams.tpMultiplier.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. 🏛️ 5-Pillar Master Confluence Suite */}
      {mc && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>5-Pillar Institutional Confluence Suite</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    คะแนนรวม: {mc.totalScore} / 100
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">ผสาน 5 เสาหลักของการวิเคราะห์เทคนิคอลเพื่อความแม่นยำสูงสุด</p>
              </div>
            </div>

            <div className="text-xs font-bold px-3 py-1 rounded-lg bg-surface-50 border border-slate-700 text-zinc-200">
              {mc.verdict}
            </div>
          </div>

          {/* 5 Pillars Progress Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>1. Trend & Regime</span>
                <span className="font-mono text-indigo-400">{mc.pillars.trendRegime.score}/25</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(mc.pillars.trendRegime.score / 25) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.trendRegime.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>2. Momentum Cycles</span>
                <span className="font-mono text-cyan-400">{mc.pillars.momentumCycles.score}/20</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(mc.pillars.momentumCycles.score / 20) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.momentumCycles.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>3. Volatility Squeeze</span>
                <span className="font-mono text-amber-400">{mc.pillars.volatilitySqueeze.score}/20</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(mc.pillars.volatilitySqueeze.score / 20) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.volatilitySqueeze.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>4. Active Sessions</span>
                <span className="font-mono text-emerald-400">{mc.pillars.volumeFlow.score}/15</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(mc.pillars.volumeFlow.score / 15) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.volumeFlow.status}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span>5. Smart Money FVG</span>
                <span className="font-mono text-purple-400">{mc.pillars.smartMoneyStructure.score}/20</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(mc.pillars.smartMoneyStructure.score / 20) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{mc.pillars.smartMoneyStructure.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* 5b. 🧭 Dynamic Multi-Timeframe Alignment Matrix [แผน 3] */}
      {analysis.timeframeMatrix && (
        <div className="p-3.5 rounded-xl bg-surface-100/90 border border-slate-700/60 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Dynamic MTF Alignment Matrix (แผน 3)</span>
                  {analysis.timeframeMatrix.alignmentScore !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        analysis.timeframeMatrix.alignmentScore >= 40
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : analysis.timeframeMatrix.alignmentScore <= -40
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      คะแนนความสอดคล้อง: {analysis.timeframeMatrix.alignmentScore > 0 ? `+${analysis.timeframeMatrix.alignmentScore}` : analysis.timeframeMatrix.alignmentScore}%
                    </span>
                  )}
                </h5>
                <p className="text-[10px] text-slate-400">
                  ถ่วงน้ำหนักตามสินทรัพย์ ({analysis.timeframeMatrix.assetCategory?.toUpperCase() || "ASSET"} Adaptive Weights) • {analysis.timeframeMatrix.summary || "สแกนทิศทางหลายช่วงเวลา"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { tf: "15M", val: analysis.timeframeMatrix.m15, label: "Intraday Flow" },
              { tf: "1H", val: analysis.timeframeMatrix.h1, label: "Hourly Trend" },
              { tf: "4H", val: analysis.timeframeMatrix.h4, label: "Macro Swing" },
              { tf: "1D", val: analysis.timeframeMatrix.d1, label: "Daily Cycle" },
            ].map((item) => {
              const isBull = item.val === "BULLISH";
              const isBear = item.val === "BEARISH";
              return (
                <div
                  key={item.tf}
                  className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${
                    isBull
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : isBear
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      : "bg-surface-50 border-slate-800 text-slate-400"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.tf}</span>
                  <span className="text-xs font-black tracking-tight my-0.5">
                    {isBull ? "BULLISH ▲" : isBear ? "BEARISH ▼" : "NEUTRAL ─"}
                  </span>
                  <span className="text-[9px] text-slate-400">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* [แผน 8] Quad-EMA 200 Confluence Badge */}
          {analysis.timeframeMatrix.quadEma && analysis.timeframeMatrix.quadEma.status !== "MIXED" && (
            <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border ${
              analysis.timeframeMatrix.quadEma.status === "GOLDEN_STACK"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/40 text-rose-300"
            }`}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>
                  {analysis.timeframeMatrix.quadEma.status === "GOLDEN_STACK"
                    ? "🔥 QUAD-EMA 200 GOLDEN STACK: ราคายืนเหนือ EMA 200 ครบทั้ง 4 ไทม์เฟรม (แรงซื้อสถาบันครบทุกมิติ)"
                    : "🛑 QUAD-EMA 200 DEATH STACK: ราคาอยู่ใต้ EMA 200 ครบทั้ง 4 ไทม์เฟรม (แรงขายคุมทุกมิติ ห้ามสวนเทรนด์)"}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 border border-slate-700">
                {analysis.timeframeMatrix.quadEma.status === "GOLDEN_STACK" ? "+10 Confluence" : "-10 Penalty"}
              </span>
            </div>
          )}

          {/* [แผน 9] Session Open Range Breakout (ORB) */}
          {analysis.sessionStatus?.orb && (
            <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border ${
              analysis.sessionStatus.orb.status === "BREAKOUT_BULL"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : analysis.sessionStatus.orb.status === "BREAKOUT_BEAR"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-surface-50 border-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>
                  30-Min Opening Range ({analysis.sessionStatus.orb.session}):{" "}
                  {analysis.sessionStatus.orb.status === "BREAKOUT_BULL"
                    ? `เบรกทะลุกรอบบน (${analysis.sessionStatus.orb.high}) ยืนยันทิศทางขึ้น ▲`
                    : analysis.sessionStatus.orb.status === "BREAKOUT_BEAR"
                    ? `เบรกหลุดกรอบล่าง (${analysis.sessionStatus.orb.low}) ยืนยันทิศทางลง ▼`
                    : `กำลังสะสมในกรอบ (${analysis.sessionStatus.orb.low} - ${analysis.sessionStatus.orb.high})`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {/* ─── TAB 2: DEEP QUANT LAB (95 อินดิเคเตอร์รันในพื้นหลัง) ─── */}
      {activeCardTab === "DEEP_QUANT" && (
        <div className="space-y-5 animate-fadeIn">
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Deep Quant Background Engine:</strong> อินดิเคเตอร์ทั้ง 95 ตัวและ 5 ควอนต์เลเยอร์คำนวณในพื้นหลังตลอดเวลาเพื่อป้อนข้อมูลให้ระบบ
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              95 Pillars Active (รันในพื้นหลัง)
            </span>
          </div>

      {/* ─── 🏛️ 5-LAYER INSTITUTIONAL QUANT ENGINE (ระดับสถาบันสากล) ─── */}
      {iq && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-surface-100 to-indigo-950/40 border border-indigo-500/40 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🏛️ 5-Layer Institutional Quant Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI/ML Hybrid Pipeline
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  สถาปัตยกรรม 5 ชั้นระดับสถาบัน: Data Hygiene • 24-D Features • ML Brain & Regime • Dynamic Risk • Walk-Forward WFE
                </p>
              </div>
            </div>

            {/* Layer Selection Tabs (1 to 5) */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              {[
                { id: 1, label: "L1: Data", icon: Database },
                { id: 2, label: "L2: Features", icon: Layers },
                { id: 3, label: "L3: Brain & ML", icon: Brain },
                { id: 4, label: "L4: Risk", icon: Scale },
                { id: 5, label: "L5: Walk-Forward", icon: Activity },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeQuantLayer === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveQuantLayer(tab.id as 1 | 2 | 3 | 4 | 5)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer 1 Content: Data Hygiene & Macro Pipeline */}
          {activeQuantLayer === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความสมบูรณ์ของแท่งเทียน (Data Hygiene):</span>
                    <span className="font-mono font-bold text-emerald-400">{iq.layer1Data.dataIntegrityScore}%</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    {iq.layer1Data.cleanCandlesCount} แท่ง (กรองจุดลวง {iq.layer1Data.outliersFiltered} จุด)
                  </div>
                  <p className="text-[10px] text-slate-400">Zero Bad Ticks • ปราศจากสัญญาณไส้หลอก</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">การกระจายตัว (Rolling Z-Score):</span>
                    <span className="font-mono font-bold text-cyan-300">Z = {iq.layer1Data.rollingZScoreRange.current}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200">
                    กรอบ 30 แท่ง: [{iq.layer1Data.rollingZScoreRange.min} ถึง {iq.layer1Data.rollingZScoreRange.max}]
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                    iq.layer1Data.stationarityStatus === "STATIONARY"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}>
                    {iq.layer1Data.stationarityStatus === "STATIONARY" ? "✅ ข้อมูลมีความนิ่ง (Stationary)" : "⚡ ข้อมูลมีแนวโน้ม (Trend Drift)"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความสัมพันธ์มหภาค ({iq.layer1Data.correlation.benchmarkSymbol}):</span>
                    <span className="font-mono font-bold text-indigo-300">r = {iq.layer1Data.correlation.correlationR}</span>
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-200">
                      {iq.layer1Data.correlation.correlationRegime}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                      iq.layer1Data.correlation.shieldAction === "PROCEED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }`}>
                      {iq.layer1Data.correlation.shieldAction}
                    </span>
                  </div>
                  {iq.layer1Data.correlation.divergenceWarning ? (
                    <p className="text-[10px] text-amber-300">{iq.layer1Data.correlation.divergenceWarning}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">แรงส่งความสัมพันธ์มหภาคเป็นไปตามทิศทางปกติ</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Layer 2 Content: 24-D Feature Engineering Vector */}
          {activeQuantLayer === 2 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-50/80 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Bullish Weight:</span>
                    <strong className="text-emerald-400 font-mono text-sm">{iq.layer2Features.aggregateBullScore}%</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-400 block text-[10px]">Bearish Weight:</span>
                    <strong className="text-rose-400 font-mono text-sm">{iq.layer2Features.aggregateBearScore}%</strong>
                  </div>
                  <div className="text-xs border-l border-slate-800 pl-3">
                    <span className="text-slate-400 block text-[10px]">หมวดเด่นที่มีอิทธิพลสูงสุด:</span>
                    <strong className="text-indigo-300 font-mono text-xs">{iq.layer2Features.dominantCategory}</strong>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 italic">
                  {iq.layer2Features.summary}
                </div>
              </div>

              {/* 24 Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {iq.layer2Features.features.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-surface-50/60 border border-slate-800 space-y-1 hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate max-w-[100px]">{f.name}</span>
                      <span className={`font-bold font-mono px-1 rounded ${
                        f.signal === "BULLISH"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : f.signal === "BEARISH"
                          ? "text-rose-400 bg-rose-500/10"
                          : "text-slate-400 bg-slate-800"
                      }`}>
                        {f.value > 0 ? `+${f.value}` : f.value}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate" title={f.description}>
                      {f.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layer 3 Content: ML Brain & Dynamic Strategy Switching */}
          {activeQuantLayer === 3 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ML Inference Probabilities */}
                <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">Random Forest Ensemble Inference</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      iq.layer3Brain.mlDirection === "BUY"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : iq.layer3Brain.mlDirection === "SELL"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-surface-100 text-slate-300 border-slate-700"
                    }`}>
                      {iq.layer3Brain.mlDirection} ({iq.layer3Brain.confidence}% Conf)
                    </span>
                  </div>

                  {/* 3-Part Probability Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-emerald-400">BUY: {iq.layer3Brain.probabilities.buy}%</span>
                      <span className="text-slate-400">WAIT/CHOP: {iq.layer3Brain.probabilities.neutral}%</span>
                      <span className="text-rose-400">SELL: {iq.layer3Brain.probabilities.sell}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 flex overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${iq.layer3Brain.probabilities.buy}%` }} />
                      <div className="bg-slate-700 transition-all duration-500" style={{ width: `${iq.layer3Brain.probabilities.neutral}%` }} />
                      <div className="bg-rose-500 transition-all duration-500" style={{ width: `${iq.layer3Brain.probabilities.sell}%` }} />
                    </div>
                  </div>

                  {/* Feature Importance Leaderboard */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Top 5 Feature Importance (SHAP-like Contribution Weights):
                    </span>
                    <div className="space-y-1">
                      {iq.layer3Brain.featureImportance.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono font-bold">#{idx + 1}</span>
                            <span>{item.featureName}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, item.weight * 3.5)}%` }} />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-indigo-300">
                              {item.weight}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Regime-Adaptive Strategy Switching */}
                <div className="p-3.5 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Dynamic Regime Strategy Switching</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {iq.layer3Brain.adaptiveStrategy.strategyMode}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-indigo-300">
                      กลยุทธ์ที่เปิดใช้งาน: {iq.layer3Brain.adaptiveStrategy.strategyName}
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      {iq.layer3Brain.adaptiveStrategy.tacticalExecution}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                    <div className="p-2 rounded bg-surface-100 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Risk Multiplier:</span>
                      <strong className="text-emerald-400 font-mono">{iq.layer3Brain.adaptiveStrategy.riskMultiplier}x Normal</strong>
                    </div>
                    <div className="p-2 rounded bg-surface-100 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Target R:R:</span>
                      <strong className="text-indigo-300 font-mono">{iq.layer3Brain.adaptiveStrategy.targetRR}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layer 4 Content: Risk Management & Dynamic Bracket */}
          {activeQuantLayer === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">ATR Volatility Lot Size:</span>
                  <div className="text-base font-mono font-black text-emerald-400">
                    {iq.layer4Risk.calculatedLotSize} Lots
                  </div>
                  <p className="text-[10px] text-slate-400">
                    คุมความเสี่ยง {iq.layer4Risk.riskPct}% (${iq.layer4Risk.dollarRisk}) บนระยะ SL {iq.layer4Risk.slPips} pips
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Fractional Kelly Criterion:</span>
                  <div className="text-base font-mono font-black text-indigo-300">
                    {iq.layer4Risk.fractionalKellyLot} Lots (f* = {iq.layer4Risk.kellyFraction})
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Half-Kelly ป้องกัน Over-leverage ตามสถิติ Win Rate & Profit Factor
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Institutional Confidence Gate:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                      iq.layer4Risk.confidenceGateStatus === "APPROVED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : iq.layer4Risk.confidenceGateStatus === "CAUTION_HALF_RISK"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}>
                      {iq.layer4Risk.confidenceGateStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    {iq.layer4Risk.gateReason}
                  </p>
                </div>
              </div>

              {/* Dynamic 3-Stage Bracket Diagram */}
              <div className="p-3 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-white block">
                  🎯 Dynamic Multi-Stage Bracket Execution:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-surface-100 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">1. Entry Zone</span>
                    <strong className="text-amber-300 text-xs">
                      {iq.layer4Risk.executionBracket.entryZone.min} - {iq.layer4Risk.executionBracket.entryZone.max}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-rose-500/30">
                    <span className="text-[9px] text-rose-400 block">2. Structural SL</span>
                    <strong className="text-rose-300 text-xs">
                      {iq.layer4Risk.executionBracket.structuralSL}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-cyan-500/30">
                    <span className="text-[9px] text-cyan-400 block">3. BE Shield Trigger (+1.0R)</span>
                    <strong className="text-cyan-300 text-xs">
                      {iq.layer4Risk.executionBracket.beTriggerPrice}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-emerald-500/30">
                    <span className="text-[9px] text-emerald-400 block">4. TP1 (+1.2R / 50% Close)</span>
                    <strong className="text-emerald-300 text-xs">
                      {iq.layer4Risk.executionBracket.tp1Price}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-surface-100 border border-indigo-500/30">
                    <span className="text-[9px] text-indigo-400 block">5. TP2 (+2.5R Trailing)</span>
                    <strong className="text-indigo-300 text-xs">
                      {iq.layer4Risk.executionBracket.tp2Price}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layer 5 Content: Walk-Forward Validation & Feedback */}
          {activeQuantLayer === 5 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Walk-Forward Efficiency (WFE):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-emerald-400">
                      {iq.layer5Validation.walkForwardEfficiency}%
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {iq.layer5Validation.robustnessGrade}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    WFE &gt; 70% พิสูจน์ว่าระบบไม่เกิด Curve-Fitting
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">In-Sample vs Out-of-Sample (OOS):</span>
                  <div className="text-xs font-mono font-bold space-y-0.5">
                    <div className="text-slate-300">In-Sample Win Rate: <span className="text-indigo-300">{iq.layer5Validation.avgISWinRate}%</span></div>
                    <div className="text-slate-300">Out-of-Sample Win Rate: <span className="text-emerald-400">{iq.layer5Validation.avgOOSWinRate}%</span></div>
                  </div>
                  <p className="text-[10px] text-slate-400">ทดสอบบนข้อมูลช่วงเวลาอนาคตที่โมเดลไม่เคยเห็น</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-50/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block">Triple Barrier Event Distribution:</span>
                  <div className="text-xs font-mono space-y-0.5">
                    <span className="text-emerald-400 block">Upper TP Hit: {iq.layer5Validation.tripleBarrierStats.hitUpperTP} ไม้</span>
                    <span className="text-rose-400 block">Lower SL Hit: {iq.layer5Validation.tripleBarrierStats.hitLowerSL} ไม้</span>
                    <span className="text-slate-400 block">Vertical Timeouts: {iq.layer5Validation.tripleBarrierStats.hitVerticalTimeout} ไม้</span>
                  </div>
                </div>
              </div>

              {/* Rolling 5-Fold Walk-Forward Table */}
              <div className="p-3 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-white block">
                  📊 Rolling K-Fold Walk-Forward Matrix (5 Folds):
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                        <th className="pb-1.5">Fold #</th>
                        <th className="pb-1.5">In-Sample (IS) Win %</th>
                        <th className="pb-1.5">Out-of-Sample (OOS) Win %</th>
                        <th className="pb-1.5">OOS Profit Factor</th>
                        <th className="pb-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {iq.layer5Validation.folds.map((f) => (
                        <tr key={f.foldIndex} className="hover:bg-slate-800/30">
                          <td className="py-1.5 font-bold text-indigo-300">Fold {f.foldIndex}</td>
                          <td className="py-1.5 text-slate-300">{f.isWinRate}% (PF: {f.isProfitFactor})</td>
                          <td className="py-1.5 text-emerald-400 font-bold">{f.oosWinRate}%</td>
                          <td className="py-1.5 text-cyan-300">{f.oosProfitFactor}x</td>
                          <td className="py-1.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              f.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                            }`}>
                              {f.passed ? "PASS" : "FAIL"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 italic">
                  {iq.layer5Validation.summary}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5c. 🎯 Institutional Order Flow & Sniper Precision Suite (Plans 11-15) */}
      {(analysis.oteZone || analysis.volumeDelta || analysis.roundLevel) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional Order Flow & Sniper Precision (แผน 11-15)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Smart Money Engine
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">ผสานโซนย่อซื้อ OTE 61.8%-78.6%, สัดส่วน Volume Delta และแรงดึงดูดตัวเลขกลม</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. OTE Golden Pocket */}
            {analysis.oteZone && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 OTE Golden Pocket</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    analysis.oteZone.isPriceInOTE
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.oteZone.isPriceInOTE ? "⚡ In Zone" : "Waiting"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Fib 61.8% - 78.6%:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.oteZone.oteMin} - {analysis.oteZone.oteMax}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Sweet Spot (70.5%):</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {analysis.oteZone.sweetSpot}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.oteZone.description}
                </p>
              </div>
            )}

            {/* 2. Volume Delta & Imbalance */}
            {analysis.volumeDelta && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚖️ Volume Delta Flow</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    analysis.volumeDelta.dominantSide === "BUYERS"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.volumeDelta.dominantSide === "SELLERS"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.volumeDelta.dominantSide}
                  </span>
                </div>
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-bold">ซื้อ {analysis.volumeDelta.buyerVolumePct}%</span>
                    <span className="text-rose-400 font-bold">ขาย {analysis.volumeDelta.sellerVolumePct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${analysis.volumeDelta.buyerVolumePct}%` }}></div>
                    <div className="h-full bg-rose-500" style={{ width: `${analysis.volumeDelta.sellerVolumePct}%` }}></div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.volumeDelta.description}
                </p>
                {analysis.volumeDelta.isAbsorption && (
                  <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-bold text-center">
                    🔥 ตรวจพบสถาบันดูดซับสภาพคล่อง (Absorption)
                  </div>
                )}
              </div>
            )}

            {/* 3. Psychological Round Number Gravity */}
            {analysis.roundLevel && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🧲 Round Number Gravity</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    analysis.roundLevel.isMagnetZone
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.roundLevel.isMagnetZone ? "🧲 Magnet Active" : "Neutral"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เลขกลมหลัก (Major Level):</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {analysis.roundLevel.nearestMajor}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ระยะห่างจากราคาปัจจุบัน:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {analysis.roundLevel.distancePips} pips
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.roundLevel.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5d. 📊 Advanced Market Profile, Exhaustion & Order Flow Suite (Plans 16-20) */}
      {(analysis.volumeProfile || analysis.tdSequential) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional Market Profile & Exhaustion Shield (แผน 16-20)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Precision Profile
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ตรวจจับจุดรวมสภาพคล่องสถาบัน (Volume Profile Value Area 70%) และดักจับจุดหมดแรงแท่งเทียน 9 สเต็ป (TD Sequential 9)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Session Volume Profile (POC, VAH, VAL) */}
            {analysis.volumeProfile && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📊 Volume Profile Value Area (70%)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.volumeProfile.isInsideValueArea
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {analysis.volumeProfile.isInsideValueArea ? "⚖️ Fair Value Zone" : "⚡ Out of Value Area"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-semibold">VAH (กรอบบน 70%)</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">{analysis.volumeProfile.vah}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/40">
                    <span className="text-[9px] text-amber-300 block font-black">POC (จุดหนาแน่นสูงสุด)</span>
                    <span className="text-xs font-mono font-black text-amber-300">{analysis.volumeProfile.poc}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-semibold">VAL (กรอบล่าง 70%)</span>
                    <span className="text-xs font-mono font-bold text-rose-300">{analysis.volumeProfile.val}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.volumeProfile.description}
                </p>
              </div>
            )}

            {/* 2. TD Sequential 9 Momentum Exhaustion */}
            {analysis.tdSequential && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⏱️ TD Sequential 9 Exhaustion Shield</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.tdSequential.isExhausted
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.tdSequential.exhaustionType === "BUY_EXHAUSTION_9"
                      ? "🛑 BUY EXHAUSTION 9"
                      : analysis.tdSequential.exhaustionType === "SELL_EXHAUSTION_9"
                      ? "🟢 SELL EXHAUSTION 9"
                      : `Setup Count: ${Math.max(analysis.tdSequential.buySetupCount, analysis.tdSequential.sellSetupCount)}/9`}
                  </span>
                </div>

                {/* Progress bar visual for 9 counts */}
                <div className="space-y-1 py-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      {analysis.tdSequential.buySetupCount > 0
                        ? `Buy Sequence: ${analysis.tdSequential.buySetupCount}/9`
                        : `Sell Sequence: ${analysis.tdSequential.sellSetupCount}/9`}
                    </span>
                    <span>{analysis.tdSequential.isExhausted ? "⚠️ Trigger Reversal" : "Building Trend"}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${
                        analysis.tdSequential.isExhausted
                          ? "bg-rose-500"
                          : analysis.tdSequential.buySetupCount > 0
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${(Math.max(analysis.tdSequential.buySetupCount, analysis.tdSequential.sellSetupCount) / 9) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.tdSequential.note}
                </p>

                {analysis.tdSequential.isExhausted && (
                  <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 font-medium">
                    🛡️ <strong>Safety Lock 7 Active:</strong> ระบบล็อคห้ามตามน้ำ ณ จุดปลายคลื่นแท่งที่ 9 เพื่อป้องกันการติดดอย/ก้นเหว
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5e. 🏛️ Institutional SMC, Anchored VWAP & CVD Matrix (Plans 21-25) */}
      {(analysis.anchoredVwap || analysis.cvd || analysis.orderBlocks) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional SMC, Anchored VWAP & CVD Matrix (แผน 21-25)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Quant SMC Matrix
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ผสานเส้นเฉลี่ยถ่วงน้ำหนักวอลุ่ม (Anchored VWAP ±3σ), การไหลของแรงซื้อขายสะสม (CVD) และโครงสร้างบล็อกสถาบัน (SMC Order & Breaker Block)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Anchored Multi-Band VWAP (±1σ, ±2σ, ±3σ) */}
            {analysis.anchoredVwap && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌐 Anchored Multi-Band VWAP</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.anchoredVwap.pricePosition === "OVERBOUGHT_EXTREME"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : analysis.anchoredVwap.pricePosition === "OVERSOLD_EXTREME"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : analysis.anchoredVwap.pricePosition === "ABOVE_VWAP"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.anchoredVwap.pricePosition}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เส้นหลักสถาบัน (VWAP):</span>
                    <span className="font-mono font-black text-amber-300">
                      {analysis.anchoredVwap.vwap}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Mean Reversion (±2σ):</span>
                    <span className="font-mono font-bold text-teal-300">
                      {analysis.anchoredVwap.lowerBand2} - {analysis.anchoredVwap.upperBand2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Exhaustion Zone (±3σ):</span>
                    <span className="font-mono text-rose-300">
                      {analysis.anchoredVwap.lowerBand3} - {analysis.anchoredVwap.upperBand3}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.anchoredVwap.description}
                </p>
              </div>
            )}

            {/* 2. Cumulative Volume Delta (CVD) Divergence Engine */}
            {analysis.cvd && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌊 CVD Flow & Divergence</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.cvd.divergence === "BULLISH_CVD_DIVERGENCE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                      : analysis.cvd.divergence === "BEARISH_CVD_DIVERGENCE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.cvd.divergence !== "NONE" ? analysis.cvd.divergence : `Trend: ${analysis.cvd.cvdTrend}`}
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-bold">ซื้อสะสม {analysis.cvd.buyerVolumeRatio}%</span>
                    <span className="text-rose-400 font-bold">ขายสะสม {(100 - analysis.cvd.buyerVolumeRatio).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${analysis.cvd.buyerVolumeRatio}%` }}></div>
                    <div className="h-full bg-rose-500" style={{ width: `${100 - analysis.cvd.buyerVolumeRatio}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Cumulative Delta:</span>
                    <span className={`font-bold ${analysis.cvd.currentCVD >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {analysis.cvd.currentCVD > 0 ? `+${analysis.cvd.currentCVD}` : analysis.cvd.currentCVD}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.cvd.description}
                </p>
                {analysis.cvd.absorptionDetected && (
                  <div className="p-1 rounded bg-teal-500/10 border border-teal-500/30 text-[10px] text-teal-300 font-bold text-center">
                    ⚡ สถาบันซับแรงคำสั่งซื้อขาย (Absorption Divergence Active)
                  </div>
                )}
              </div>
            )}

            {/* 3. SMC Order Block Mitigation & Breaker Block Validator */}
            {analysis.orderBlocks && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🧱 SMC Order Block & Breakers</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.orderBlocks.isRetestingBreaker
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse"
                      : analysis.orderBlocks.hasUnmitigatedOB
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.orderBlocks.isRetestingBreaker
                      ? "🔥 Breaker Retest"
                      : analysis.orderBlocks.hasUnmitigatedOB
                      ? "🟢 Fresh OB"
                      : "Mitigated"}
                  </span>
                </div>

                {analysis.orderBlocks.nearestBlock ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">บล็อกใกล้สุด ({analysis.orderBlocks.nearestBlock.type}):</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {analysis.orderBlocks.nearestBlock.priceMin} - {analysis.orderBlocks.nearestBlock.priceMax}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สถานะบล็อก:</span>
                      <span className="font-mono text-slate-200">
                        {analysis.orderBlocks.nearestBlock.isBreaker ? "⚡ Breaker Flipped" : analysis.orderBlocks.nearestBlock.isMitigated ? "Mitigated (ทดสอบแล้ว)" : "Unmitigated (สดใหม่)"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">กำลังสแกนโครงสร้างบล็อกสถาบัน...</div>
                )}

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.orderBlocks.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5f. 🏹 Institutional Sweeps, Fib Clusters & Correlation Shield (Plans 26-30) */}
      {(analysis.sessionSweep || analysis.fibonacciCluster || analysis.realizedVolatility || analysis.correlationShield) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Session Liquidity Sweeps, Fib Clusters & Macro Shield (แผน 26-30)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Institutional Liquidity & Volatility
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ตรวจจับการกวาดสภาพคล่องเซสชั่น (Turtle Soup), คลัสเตอร์ฟิโบนักชี 3D, ความผันผวน Parkinson Realized Volatility และ Macro Correlation Hedge Shield
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Session Liquidity Sweeps */}
            {analysis.sessionSweep && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏹 Session Sweep Alert</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.sessionSweep.sweepType !== "NONE"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.sessionSweep.sweepType !== "NONE" ? analysis.sessionSweep.sweepType : "No Sweep"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Swept Session:</span>
                    <span className="font-mono text-slate-300">{analysis.sessionSweep.sweptSession}</span>
                  </div>
                  {analysis.sessionSweep.sweptLevel > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Swept Level:</span>
                      <span className="font-mono font-bold text-rose-300">
                        {analysis.sessionSweep.sweptLevel} (+{analysis.sessionSweep.sweepDistancePips} pips)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Turtle Soup:</span>
                    <span className="font-mono text-emerald-400">{analysis.sessionSweep.isTurtleSoup ? "⚡ Active Setup" : "None"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.sessionSweep.description}
                </p>
              </div>
            )}

            {/* 2. Fibonacci Multi-Timeframe Clusters */}
            {analysis.fibonacciCluster && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📐 Fibonacci 3D Clusters</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.fibonacciCluster.isPriceInCluster
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                      : analysis.fibonacciCluster.confluenceCount >= 2
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.fibonacciCluster.confluenceCount} Confluences
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Golden Zone:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.fibonacciCluster.clusterZone.min} - {analysis.fibonacciCluster.clusterZone.max}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะราคา:</span>
                    <span className="font-mono text-slate-200">
                      {analysis.fibonacciCluster.isPriceInCluster ? "🎯 Inside Golden Zone" : "Outside Zone"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.fibonacciCluster.description}
                </p>
              </div>
            )}

            {/* 3. Realized Volatility & Microstructure */}
            {(analysis.realizedVolatility || analysis.candleMicrostructure) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Realized Vol & Micro</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.realizedVolatility?.volState === "EXPANSION"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : analysis.realizedVolatility?.volState === "COMPRESSION"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.realizedVolatility?.volState || "NORMAL"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.realizedVolatility && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Parkinson Vol:</span>
                      <span className="font-mono text-slate-200">{analysis.realizedVolatility.realizedVol}% (Buffer {analysis.realizedVolatility.recommendedBufferMultiplier}x)</span>
                    </div>
                  )}
                  {analysis.candleMicrostructure && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Micro Pattern:</span>
                      <span className="font-mono text-sky-300">{analysis.candleMicrostructure.rejectionStrength}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.candleMicrostructure?.description || analysis.realizedVolatility?.description}
                </p>
              </div>
            )}

            {/* 4. Multi-Asset Correlation Hedge Shield */}
            {analysis.correlationShield && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🛡️ Correlation Hedge</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.correlationShield.macroRegime === "LIQUIDATION_ANOMALY"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : analysis.correlationShield.macroRegime === "DECOUPLED_SAFE_HAVEN"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.correlationShield.macroRegime}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Shield Status:</span>
                    <span className="font-mono text-slate-300 text-[10px]">{analysis.correlationShield.shieldStatus}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">DXY Trend:</span>
                    <span className="font-mono font-bold text-indigo-300">{analysis.correlationShield.dxyTrend}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.correlationShield.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5g. 🏛️ Institutional Price Action, FVG & Premium/Discount Matrix (Plans 31-35) */}
      {(analysis.fvgMitigation || analysis.marketStructureShift || analysis.premiumDiscount || analysis.keyLevelTargets || analysis.orderFlowVelocity) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional FVG, Market Structure & Premium/Discount Matrix (แผน 31-35)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Smart Money Price Action
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  สแกน FVG Consequent Encroachment (50%), การเปลี่ยนโครงสร้างแท้จริง (MSS Displacement), กรอบ Dealing Range 0-100% (Safety Lock 10) และเป้าหมายสภาพคล่องภายนอก
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Institutional FVG & C.E. 50% Tracker */}
            {analysis.fvgMitigation && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🕳️ FVG Imbalance Tracker</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.fvgMitigation.bias === "BULLISH_IMBALANCE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.fvgMitigation.bias === "BEARISH_IMBALANCE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.fvgMitigation.bias}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Unmitigated FVGs:</span>
                    <span className="font-mono text-amber-300 font-bold">{analysis.fvgMitigation.unmitigatedCount} ช่องว่าง</span>
                  </div>
                  {analysis.fvgMitigation.recommendedEntryLimit && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">C.E. 50% Limit Entry:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {analysis.fvgMitigation.recommendedEntryLimit}
                      </span>
                    </div>
                  )}
                  {analysis.fvgMitigation.nearestFVG && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สถานะ FVG ใกล้สุด:</span>
                      <span className="font-mono text-[10px] text-slate-300">
                        {analysis.fvgMitigation.nearestFVG.mitigationStatus}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.fvgMitigation.description}
                </p>
              </div>
            )}

            {/* 2. Market Structure Shift (MSS) */}
            {analysis.marketStructureShift && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ MSS Displacement Engine</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.marketStructureShift.type === "BULLISH_MSS"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                      : analysis.marketStructureShift.type === "BEARISH_MSS"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.marketStructureShift.type !== "NONE" ? analysis.marketStructureShift.type : "Structure Intact"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Displacement:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {analysis.marketStructureShift.displacementMultiplier}x ATR ({analysis.marketStructureShift.displacementVelocity})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความถูกต้องโครงสร้าง:</span>
                    <span className={`font-mono text-[10px] ${analysis.marketStructureShift.isTrueDisplacement ? "text-emerald-400 font-bold" : "text-amber-400"}`}>
                      {analysis.marketStructureShift.isTrueDisplacement ? "⚡ True Displacement" : "Normal / Wick"}
                    </span>
                  </div>
                  {analysis.marketStructureShift.breakPrice > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">จุดเบรกโครงสร้าง:</span>
                      <span className="font-mono text-indigo-300 font-bold">
                        {analysis.marketStructureShift.breakPrice}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.marketStructureShift.description}
                </p>
              </div>
            )}

            {/* 3. Premium vs Discount Dealing Range Matrix */}
            {analysis.premiumDiscount && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📊 Dealing Range (P/D Matrix)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.premiumDiscount.zone === "EXTREME_PREMIUM"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : analysis.premiumDiscount.zone === "DEEP_DISCOUNT"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold animate-pulse"
                      : analysis.premiumDiscount.zone === "PREMIUM"
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      : analysis.premiumDiscount.zone === "DISCOUNT"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.premiumDiscount.zone} ({analysis.premiumDiscount.percentile}%)
                  </span>
                </div>

                {/* Visual Dealing Range Percentile Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/30" style={{ width: "20%" }}></div>
                    <div className="absolute left-[20%] top-0 bottom-0 bg-emerald-500/15" style={{ width: "25%" }}></div>
                    <div className="absolute left-[45%] top-0 bottom-0 bg-slate-600/30" style={{ width: "10%" }}></div>
                    <div className="absolute left-[55%] top-0 bottom-0 bg-rose-500/15" style={{ width: "25%" }}></div>
                    <div className="absolute left-[80%] top-0 bottom-0 bg-rose-500/30" style={{ width: "20%" }}></div>
                    <div
                      className="absolute top-0 bottom-0 w-1.5 bg-amber-400 shadow-md shadow-amber-400/50 rounded-full -ml-0.5"
                      style={{ left: `${analysis.premiumDiscount.percentile}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                    <span>0% Deep Disc</span>
                    <span className="text-slate-400">50% Eq: {analysis.premiumDiscount.equilibrium}</span>
                    <span>100% Ext Prem</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Safety Lock 10:</span>
                    <span className={`font-mono text-[10px] font-bold ${analysis.premiumDiscount.tradeAllowed ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                      {analysis.premiumDiscount.tradeAllowed ? "✅ ปลดล็อคเทรดได้" : "⛔ ห้ามเปิดออเดอร์ตามโซน"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.premiumDiscount.description}
                </p>
              </div>
            )}

            {/* 4. Liquidity Targets & Order Flow Velocity */}
            {(analysis.keyLevelTargets || analysis.orderFlowVelocity) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 Liquidity & Flow Velocity</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.orderFlowVelocity?.isClimaxExhaustion
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : (analysis.orderFlowVelocity?.velocityScore ?? 0) > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {analysis.orderFlowVelocity?.isClimaxExhaustion ? "🔥 Climax Alert" : `Vel: ${analysis.orderFlowVelocity?.velocityScore ?? 0}`}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.keyLevelTargets && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">เป้าสภาพคล่องใกล้สุด:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {analysis.keyLevelTargets.nearestLiquidityTarget.name} ({analysis.keyLevelTargets.nearestLiquidityTarget.distancePips} pips)
                      </span>
                    </div>
                  )}
                  {analysis.orderFlowVelocity && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สภาวะโมเมนตัม:</span>
                      <span className="font-mono text-slate-200 text-[10px]">
                        {analysis.orderFlowVelocity.momentumState}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.keyLevelTargets?.description || analysis.orderFlowVelocity?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5h. 📈 Dynamic Multi-Stage Breakeven, Liquidity Void & MTF Structure Dashboard (Plans 36-40) */}
      {(analysis.breakevenLadder || analysis.liquidityVoid || analysis.fibonacciExtension || analysis.footprintAbsorption || analysis.mtfStructureMatrix) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Dynamic BE Ladder, Liquidity Void & MTF Structure Dashboard (แผน 36-40)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Execution & Structure Matrix
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ระบบบันไดเลื่อน SL กึ่งอัตโนมัติ 3 ขั้น, แรงดูดสุญญากาศสภาพคล่อง Liquidity Void, ตาข่าย Fibonacci Extension Mesh, ปริมาณดูดซับสถาบัน VSA และแดชบอร์ดโครงสร้าง 4 ไทม์เฟรม (Safety Lock 11)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Multi-Stage Breakeven Ladder (Plan 36) */}
            {analysis.breakevenLadder && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🪜 Dynamic BE Ladder</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.breakevenLadder.currentStage >= 2
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : analysis.breakevenLadder.currentStage === 1
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    ขั้นที่ {analysis.breakevenLadder.currentStage}/3 ({analysis.breakevenLadder.currentRMultiple > 0 ? `+${analysis.breakevenLadder.currentRMultiple}` : analysis.breakevenLadder.currentRMultiple}R)
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">SL ที่แนะนำตอนนี้:</span>
                    <span className="font-mono text-emerald-400 font-bold">{analysis.breakevenLadder.recommendedSL}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สัดส่วนแบ่งปิดกำไร:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.breakevenLadder.partialCloseRecommendedPct}%
                    </span>
                  </div>
                  {/* Stages indicator */}
                  <div className="pt-1 space-y-1">
                    {analysis.breakevenLadder.stages.map((st) => (
                      <div key={st.stage} className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span className={st.isTriggered ? "text-emerald-300 font-bold" : "text-slate-500"}>
                          {st.isTriggered ? "✅" : "⏳"} ขั้น {st.stage} (+{st.triggerGainR}R)
                        </span>
                        <span className="text-slate-300">SL: {st.slMovePrice}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.breakevenLadder.actionAdvice}
                </p>
              </div>
            )}

            {/* Card 2: Liquidity Void & Fast-Fill Vacuum (Plan 37) */}
            {analysis.liquidityVoid && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌪️ Liquidity Void Fast-Fill</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.liquidityVoid.vacuumDirection === "UPWARD_VACUUM"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.liquidityVoid.vacuumDirection === "DOWNWARD_VACUUM"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.liquidityVoid.vacuumDirection !== "NONE" ? analysis.liquidityVoid.vacuumDirection : "No Big Void"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ช่องว่างค้างในตลาด:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.liquidityVoid.activeVoidCount} โซน
                    </span>
                  </div>
                  {analysis.liquidityVoid.nearestVoid && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">เป้าดูด 50% Fast-Fill:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {analysis.liquidityVoid.nearestVoid.fillTarget50}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">ความน่าจะเป็นเติมเต็ม:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {analysis.liquidityVoid.fastFillProbabilityPct}% (เติมแล้ว {analysis.liquidityVoid.nearestVoid.fillPercentage}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.liquidityVoid.description}
                </p>
              </div>
            )}

            {/* Card 3: Fibonacci Extension Mesh & VSA Footprint (Plan 38 & 39) */}
            {(analysis.fibonacciExtension || analysis.footprintAbsorption) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📐 Fib Mesh & Footprint</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.footprintAbsorption?.isInstitutionalAbsorption
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.footprintAbsorption?.vsaSignal !== "NORMAL" ? analysis.footprintAbsorption?.vsaSignal : "VSA Balanced"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.fibonacciExtension?.bestTakeProfitTarget && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">1.618 Golden Extension:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {analysis.fibonacciExtension.bestTakeProfitTarget.price}
                      </span>
                    </div>
                  )}
                  {analysis.footprintAbsorption && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Effort vs Result:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          analysis.footprintAbsorption.effortVsResult === "HIGH_EFFORT_LOW_RESULT"
                            ? "text-purple-300"
                            : "text-slate-300"
                        }`}>
                          {analysis.footprintAbsorption.effortVsResult}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Relative Volume:</span>
                        <span className="font-mono text-slate-200">
                          {analysis.footprintAbsorption.relativeVolume}x (Spread: {analysis.footprintAbsorption.spreadRatio}x)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.footprintAbsorption?.description || analysis.fibonacciExtension?.description}
                </p>
              </div>
            )}

            {/* Card 4: MTF Structure Matrix Dashboard (Plan 40 & Safety Lock 11) */}
            {analysis.mtfStructureMatrix && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌐 MTF Structure Matrix</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.mtfStructureMatrix.isHTFConflict
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : analysis.mtfStructureMatrix.overallAlignment.includes("FULL")
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.mtfStructureMatrix.alignmentScorePct}% Aligned
                  </span>
                </div>

                {/* 4-Timeframe Grid: 15m, 1h, 4h, 1D */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {(["m15", "h1", "h4", "d1"] as const).map((tfKey) => {
                    const tf = analysis.mtfStructureMatrix?.timeframes[tfKey];
                    if (!tf) return null;
                    const isBull = tf.trendBias === "BULLISH";
                    const isBear = tf.trendBias === "BEARISH";
                    return (
                      <div
                        key={tfKey}
                        className={`p-1 rounded text-center border ${
                          isBull
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : isBear
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-surface-50 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="text-[9px] font-bold uppercase">{tf.timeframe}</div>
                        <div className="text-[8px] font-mono font-black">{tf.structure}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Safety Lock 11 (HTF):</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.mtfStructureMatrix.isHTFConflict
                        ? "text-rose-400 animate-pulse"
                        : "text-emerald-400"
                    }`}>
                      {analysis.mtfStructureMatrix.isHTFConflict ? "⛔ สวนเทรนด์ H4/D1" : "✅ สอดคล้องโครงสร้างใหญ่"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.mtfStructureMatrix.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5i. 🎯 Liquidity Inducement, ChoS Delivery, Risk Bracket & MCPI Conviction Matrix (Plans 41-45) */}
      {(analysis.liquidityInducement || analysis.institutionalChoS || analysis.dynamicRiskBracket || analysis.rejectionBlock || analysis.mcpiConviction) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-slate-700/60 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Liquidity Inducement, ChoS Delivery, Risk Bracket & MCPI Matrix (แผน 41-45)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Institutional Precision & Safety Lock 12
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  ระบบตรวจจับกับดักสภาพคล่อง IDM/EQH/EQL, การส่งมอบคำสั่ง ChoS สถาบัน, พิกัดความเสี่ยง Adaptive Risk Bracket, บล็อคปฏิเสธราคา Rejection Block และคะแนนรวมเอกภาพ MCPI 0-100
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Liquidity Inducement & Engineering (Plan 41 & Safety Lock 12) */}
            {analysis.liquidityInducement && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🪤 Liquidity Inducement</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.liquidityInducement.isInducementTrap
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                  }`}>
                    {analysis.liquidityInducement.isInducementTrap ? "⛔ TRAP DETECTED" : "✅ CLEAR ZONE"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Trap Type:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.liquidityInducement.trapType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ทิศทางกับดัก:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.liquidityInducement.inducementDirection}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ระดับดักสภาพคล่อง (IDM):</span>
                    <span className="font-mono text-slate-200">
                      {analysis.liquidityInducement.idmLevel ?? "None"} ({analysis.liquidityInducement.distanceToTrapPips} pips)
                    </span>
                  </div>
                  {(analysis.liquidityInducement.eqhPrice || analysis.liquidityInducement.eqlPrice) && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">EQH / EQL Pool:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {analysis.liquidityInducement.eqhPrice ? `EQH: ${analysis.liquidityInducement.eqhPrice}` : `EQL: ${analysis.liquidityInducement.eqlPrice}`}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.liquidityInducement.description}
                </p>
              </div>
            )}

            {/* Card 2: Institutional ChoS Delivery Matrix (Plan 42) */}
            {analysis.institutionalChoS && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🚀 ChoS Delivery Matrix</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.institutionalChoS.deliveryState === "EXPANSION_DELIVERY"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : analysis.institutionalChoS.deliveryState === "ACCUMULATION"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold"
                      : analysis.institutionalChoS.deliveryState === "MANIPULATION"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-800"
                  }`}>
                    {analysis.institutionalChoS.deliveryState}
                  </span>
                </div>
                {/* Score Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Delivery Score:</span>
                    <span className="font-mono font-bold text-indigo-300">{analysis.institutionalChoS.deliveryScore} / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, analysis.institutionalChoS.deliveryScore))}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ผู้เล่นหลักในตลาด:</span>
                    <span className="font-mono text-[10px] font-bold text-slate-200">
                      {analysis.institutionalChoS.dominantParticipant}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Expansion Bars:</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {analysis.institutionalChoS.consecutiveExpansionBars} แท่งขยายตัวต่อเนื่อง
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.institutionalChoS.description}
                </p>
              </div>
            )}

            {/* Card 3: Dynamic Risk Bracket & Rejection Block (Plan 43 & 44) */}
            {(analysis.dynamicRiskBracket || analysis.rejectionBlock) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🛡️ Risk Bracket & Rejection</span>
                  {analysis.dynamicRiskBracket && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      analysis.dynamicRiskBracket.currentRiskBracket === "DEFENSIVE_HALT"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                        : analysis.dynamicRiskBracket.currentRiskBracket === "CONSERVATIVE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : analysis.dynamicRiskBracket.currentRiskBracket === "AGGRESSIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                        : "bg-surface-50 text-slate-300 border border-slate-700"
                    }`}>
                      {analysis.dynamicRiskBracket.currentRiskBracket}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.dynamicRiskBracket && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">ความเสี่ยงแนะนำ:</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {analysis.dynamicRiskBracket.recommendedRiskPct}% (Scale: {analysis.dynamicRiskBracket.drawdownThrottleMultiplier}x)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">โควต้าเทรดเหลือวันนี้:</span>
                        <span className="font-mono text-slate-300">
                          {analysis.dynamicRiskBracket.maxDailyTradesRemaining} ไม้ (เสียติดกัน: {analysis.dynamicRiskBracket.consecutiveLossCount})
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.rejectionBlock && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Rejection Blocks:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {analysis.rejectionBlock.blocks.length} โซน (Wick: {analysis.rejectionBlock.rejectionWickRatioPct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Wick Exhaustion:</span>
                        <span className="font-mono text-[10px] font-bold text-amber-300">
                          {analysis.rejectionBlock.wickExhaustionScore} / 100
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.dynamicRiskBracket?.description || analysis.rejectionBlock?.description}
                </p>
              </div>
            )}

            {/* Card 4: Unified MCPI Conviction Matrix (Plan 45 & Safety Lock 12) */}
            {analysis.mcpiConviction && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Unified MCPI Conviction</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.mcpiConviction.convictionTier === "TITANIUM"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 glow-purple"
                      : analysis.mcpiConviction.convictionTier === "PLATINUM"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : analysis.mcpiConviction.convictionTier === "GOLD"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : analysis.mcpiConviction.convictionTier === "SILVER"
                      ? "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  }`}>
                    {analysis.mcpiConviction.convictionTier}
                  </span>
                </div>

                {/* Big Score Display */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-50 border border-slate-800">
                  <div className="text-center flex-1">
                    <span className="text-[10px] text-slate-400 block">MCPI Score</span>
                    <span className="text-lg font-black font-mono text-white">
                      {analysis.mcpiConviction.score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </span>
                  </div>
                  <div className="text-center flex-1 border-l border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Safety Lock 12</span>
                    <span className={`text-[11px] font-bold font-mono ${
                      analysis.mcpiConviction.isApprovedForExecution ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.mcpiConviction.isApprovedForExecution ? "✅ APPROVED" : "⛔ BLOCKED"}
                    </span>
                  </div>
                </div>

                {/* 12-Pillar Metrics */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ผ่านเสาหลัก Confluence:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {analysis.mcpiConviction.pillarsPassedCount} / 12 เสาหลัก
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Institutional Backing:</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {analysis.mcpiConviction.institutionalBackingRatioPct}% สถาบันหนุน
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.mcpiConviction.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5j. 🏛️ Grand Quant Milestone 50: Harmonics, DSP Cycles, Entropy & Pattern Matrix (Plans 46-50) */}
      {(analysis.harmonics || analysis.ehlersMESA || analysis.shannonEntropy || analysis.candlestickPatterns || analysis.milestone50) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-purple-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Grand Quant Milestone 50: Harmonics, DSP Cycles, Entropy & Pattern Matrix (แผน 46-50)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-amber-500/20 text-amber-300 border border-amber-500/30">
                    🏛️ 50-Point Institutional Golden Ticket
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  เครื่องยนต์ตรวจจับแพทเทิร์นฮาร์โมนิก PRZ, วิเคราะห์คลื่นวงจรสถิติ Ehlers MESA DSP, เกราะกรองสัญญาณรบกวน Shannon Entropy, แท่งเทียน Price Action Matrix และบทสรุป 50 ยุทธวิธีควอนท์
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Harmonic PRZ Pattern Engine (Plan 46) */}
            {analysis.harmonics && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📐 Harmonic PRZ Patterns</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.harmonics.hasPattern
                      ? analysis.harmonics.bestPattern?.type === "BULLISH"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.harmonics.hasPattern ? `${analysis.harmonics.bestPattern?.type} PATTERN` : "SCANNING"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">แพทเทิร์นเด่น:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.harmonics.bestPattern?.patternName ?? "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">โซนกลับตัว PRZ:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.harmonics.bestPattern?.prz ? `${analysis.harmonics.bestPattern.prz.min} - ${analysis.harmonics.bestPattern.prz.max}` : "N/A"}
                    </span>
                  </div>
                  {analysis.harmonics.bestPattern && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">เป้าหมาย TP1 / TP2:</span>
                        <span className="font-mono text-emerald-300 text-[10px]">
                          {analysis.harmonics.bestPattern.targetTP1} / {analysis.harmonics.bestPattern.targetTP2}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Invalidation SL:</span>
                        <span className="font-mono text-rose-300 text-[10px]">
                          {analysis.harmonics.bestPattern.invalidationSL} (ความสมบูรณ์ {analysis.harmonics.bestPattern.confluenceScore}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.harmonics.description}
                </p>
              </div>
            )}

            {/* Card 2: Ehlers MESA DSP Dominant Cycle (Plan 47) */}
            {analysis.ehlersMESA && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📡 Ehlers MESA DSP Cycle</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.ehlersMESA.cycleState === "CYCLE_MODE"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {analysis.ehlersMESA.cycleState}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">รอบคลื่นหลัก (Dominant):</span>
                    <span className="font-mono font-bold text-white">
                      {analysis.ehlersMESA.dominantCyclePeriod} แท่งเทียน
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Phase Angle:</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {analysis.ehlersMESA.phaseAngle}° ({analysis.ehlersMESA.isCycleTurning ? "⚡ Turning Point" : "Steady"})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">InPhase / Quadrature:</span>
                    <span className="font-mono text-slate-300 text-[10px]">
                      {analysis.ehlersMESA.inPhase} / {analysis.ehlersMESA.quadrature}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.ehlersMESA.description}
                </p>
              </div>
            )}

            {/* Card 3: Shannon Entropy & Statistical Noise Filter (Plan 48 & Safety Lock 13) */}
            {analysis.shannonEntropy && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎲 Shannon Entropy Shield</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    analysis.shannonEntropy.safetyLock13Passed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse"
                  }`}>
                    {analysis.shannonEntropy.safetyLock13Passed ? "🛡️ LOCK 13 PASS" : "⛔ NOISE BLOCKED"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Entropy ความโกลาหล:</span>
                    <span className={`font-mono font-bold ${
                      analysis.shannonEntropy.normalizedEntropy >= 0.8
                        ? "text-rose-400"
                        : analysis.shannonEntropy.normalizedEntropy <= 0.4
                        ? "text-emerald-400"
                        : "text-amber-300"
                    }`}>
                      {analysis.shannonEntropy.normalizedEntropy} ({analysis.shannonEntropy.orderliness})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สัดส่วน Noise ตลาด:</span>
                    <span className="font-mono text-slate-300">
                      {analysis.shannonEntropy.noisePct ?? 50}% (สัญญาณแท้ {100 - (analysis.shannonEntropy.noisePct ?? 50)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะระเบียบของราคา:</span>
                    <span className="font-mono text-cyan-300 text-[10px]">
                      {analysis.shannonEntropy.orderliness === "HIGHLY_ORDERED_TREND"
                        ? "ระเบียบสูง (เทรนด์คม)"
                        : analysis.shannonEntropy.orderliness === "MODERATE_ENTROPY"
                        ? "โครงสร้างปานกลาง"
                        : "สัญญาณรบกวนหนาแน่น"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.shannonEntropy.description}
                </p>
              </div>
            )}

            {/* Card 4: Candlestick Matrix & Grand Milestone 50 Golden Ticket (Plan 49 & 50) */}
            {(analysis.candlestickPatterns || analysis.milestone50) && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-surface-100 via-surface-100/90 to-purple-950/20 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🕯️ Candlesticks & Milestone 50</span>
                  {analysis.milestone50 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.milestone50.goldenTicketStatus === "GOLDEN_TICKET_APPROVED"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 glow-gold"
                        : "bg-surface-50 text-slate-400 border border-slate-700"
                    }`}>
                      {analysis.milestone50.goldenTicketStatus === "GOLDEN_TICKET_APPROVED" ? "🏆 GOLDEN TICKET" : analysis.milestone50.goldenTicketStatus}
                    </span>
                  )}
                </div>

                {/* Big Score Display */}
                {analysis.milestone50 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-50 border border-purple-500/30">
                    <div className="text-center flex-1">
                      <span className="text-[10px] text-slate-400 block">Milestone Score</span>
                      <span className="text-lg font-black font-mono text-amber-300">
                        {analysis.milestone50.milestoneScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                      </span>
                    </div>
                    <div className="text-center flex-1 border-l border-slate-800">
                      <span className="text-[10px] text-slate-400 block">เกรด 50 ปัจจัย</span>
                      <span className="text-sm font-black font-mono text-purple-300">
                        {analysis.milestone50.milestoneGrade}
                      </span>
                    </div>
                  </div>
                )}

                {/* Candlestick & Locks detail */}
                <div className="space-y-1 text-xs">
                  {analysis.candlestickPatterns && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Candlestick Signal:</span>
                      <span className={`font-mono font-bold text-[10px] ${
                        analysis.candlestickPatterns.dominantSignal.includes("BULLISH")
                          ? "text-emerald-400"
                          : analysis.candlestickPatterns.dominantSignal.includes("BEARISH")
                          ? "text-rose-400"
                          : "text-slate-300"
                      }`}>
                        {analysis.candlestickPatterns.dominantSignal} ({analysis.candlestickPatterns.detectedPatterns.length} รูปแบบ)
                      </span>
                    </div>
                  )}
                  {analysis.milestone50 && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Confluence Pillars:</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {analysis.milestone50.activePillarsCount} / 13 เสาหลัก
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Safety Locks ผ่าน:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {analysis.milestone50.safetyLocksPassedCount} / 13 ตัวล็อค
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.milestone50?.summary || analysis.candlestickPatterns?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5k. 📈 Statistical Physics, Kalman Filter & Volatility Squeeze Matrix (Plans 51-55) */}
      {(analysis.hurstExponent || analysis.kalmanFilter || analysis.halfLife || analysis.ttmSqueeze || analysis.chaikinMoneyFlow) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-teal-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Statistical Physics, Kalman State & Volatility Squeeze Matrix (แผน 51-55)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border border-teal-500/30">
                    🔬 Physics & Dynamic Volatility
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  เครื่องยนต์คำนวณสถิติความจำตลาด Hurst Exponent, ตัวกรองแฝง Kalman Filter, คำนวณความเร็วการดึงกลับ Ornstein-Uhlenbeck Half-Life, TTM Squeeze การบีบตัว และ Chaikin Money Flow Shield
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Hurst Exponent & Long-Memory Persistence (Plan 51) */}
            {analysis.hurstExponent && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🧬 Hurst Exponent (H)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.hurstExponent.marketCharacter === "PERSISTENT_TRENDING"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.hurstExponent.marketCharacter === "MEAN_REVERTING_ANTI_PERSISTENT"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.hurstExponent.marketCharacter === "PERSISTENT_TRENDING"
                      ? "TRENDING H > 0.55"
                      : analysis.hurstExponent.marketCharacter === "MEAN_REVERTING_ANTI_PERSISTENT"
                      ? "MEAN-REVERT H < 0.45"
                      : "RANDOM WALK H ~ 0.5"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ค่าสถิติ Hurst (H):</span>
                    <span className={`font-mono font-bold ${
                      analysis.hurstExponent.hurst > 0.55
                        ? "text-emerald-400"
                        : analysis.hurstExponent.hurst < 0.45
                        ? "text-purple-400"
                        : "text-slate-300"
                    }`}>
                      {analysis.hurstExponent.hurst}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">พฤติกรรมโครงสร้าง:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.hurstExponent.marketCharacter === "PERSISTENT_TRENDING"
                        ? "เทรนด์จำสภาวะต่อเนื่อง"
                        : analysis.hurstExponent.marketCharacter === "MEAN_REVERTING_ANTI_PERSISTENT"
                        ? "ดึงกลับเข้าหาค่าเฉลี่ย"
                        : "สุ่มไร้ทิศทาง (Random Walk)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความเชื่อมั่นแบบจำลอง:</span>
                    <span className="font-mono text-emerald-300 text-[10px]">
                      {analysis.hurstExponent.confidence}% Confidence
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.hurstExponent.description}
                </p>
              </div>
            )}

            {/* Card 2: Kalman Filter Latent State Estimator (Plan 52) */}
            {analysis.kalmanFilter && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 Kalman State Estimator</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.kalmanFilter.trendBias === "BULLISH_ABOVE_KALMAN"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.kalmanFilter.trendBias === "BEARISH_BELOW_KALMAN"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.kalmanFilter.trendBias === "BULLISH_ABOVE_KALMAN"
                      ? "BULLISH BIAS"
                      : analysis.kalmanFilter.trendBias === "BEARISH_BELOW_KALMAN"
                      ? "BEARISH BIAS"
                      : "EQUILIBRIUM"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Latent True Price:</span>
                    <span className="font-mono font-bold text-white">
                      {analysis.kalmanFilter.filteredPrice}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Estimation Error (±):</span>
                    <span className="font-mono text-amber-300 text-[10px]">
                      ±{analysis.kalmanFilter.estimationError} (Gain: {analysis.kalmanFilter.kalmanGain ?? 0})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Innovation Residual:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.kalmanFilter.innovativeResidual > 0
                        ? "text-emerald-300"
                        : analysis.kalmanFilter.innovativeResidual < 0
                        ? "text-rose-300"
                        : "text-slate-400"
                    }`}>
                      {analysis.kalmanFilter.innovativeResidual > 0 ? `+${analysis.kalmanFilter.innovativeResidual}` : analysis.kalmanFilter.innovativeResidual}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.kalmanFilter.description}
                </p>
              </div>
            )}

            {/* Card 3: Ornstein-Uhlenbeck Mean Reversion Half-Life (Plan 53) */}
            {analysis.halfLife && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⏱️ OU Half-Life Reversion</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.halfLife.reversionVelocity === "FAST_SCALP"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.halfLife.reversionVelocity === "MEDIUM_SWING"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  }`}>
                    {analysis.halfLife.reversionVelocity === "FAST_SCALP"
                      ? "⚡ FAST SCALP"
                      : analysis.halfLife.reversionVelocity === "MEDIUM_SWING"
                      ? "⏱️ MEDIUM SWING"
                      : "🌊 TRENDING"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">รอบดึงกลับ (Half-Life):</span>
                    <span className="font-mono font-bold text-teal-300">
                      {analysis.halfLife.halfLifeCandles < 900 ? `${analysis.halfLife.halfLifeCandles} แท่งเทียน` : "ไม่ดึงกลับ (Trend)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">พฤติกรรม Reversion:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.halfLife.reversionVelocity === "FAST_SCALP"
                        ? "คืนค่าเฉลี่ยรวดเร็ว (Scalp)"
                        : analysis.halfLife.reversionVelocity === "MEDIUM_SWING"
                        ? "คืนค่าเฉลี่ยปานกลาง (Swing)"
                        : "หลุดสถิติค่ากลาง (เกาะเทรนด์)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความเร็วการคืนตัว:</span>
                    <span className="font-mono text-emerald-300 text-[10px]">
                      {analysis.halfLife.reversionVelocity}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.halfLife.description}
                </p>
              </div>
            )}

            {/* Card 4: TTM Squeeze & CMF Accumulation Matrix (Plans 54 & 55 + Safety Lock 14) */}
            {(analysis.ttmSqueeze || analysis.chaikinMoneyFlow) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🗜️ TTM Squeeze & CMF</span>
                  {analysis.chaikinMoneyFlow && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.chaikinMoneyFlow.safetyLock14Passed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                    }`}>
                      {analysis.chaikinMoneyFlow.safetyLock14Passed ? "🛡️ LOCK 14 PASS" : "⛔ CMF BLOCKED"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  {analysis.ttmSqueeze && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">สถานะ TTM Squeeze:</span>
                        <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          analysis.ttmSqueeze.isSqueezeOn
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                            : analysis.ttmSqueeze.squeezeFired
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-700/40 text-slate-300"
                        }`}>
                          {analysis.ttmSqueeze.isSqueezeOn
                            ? "🗜️ SQUEEZE ON"
                            : analysis.ttmSqueeze.squeezeFired
                            ? "💥 SQUEEZE FIRED"
                            : "EXPANSION"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Squeeze Momentum:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.ttmSqueeze.momentumDirection.includes("INCREASING_BULL")
                            ? "text-emerald-400"
                            : analysis.ttmSqueeze.momentumDirection.includes("DECREASING_BULL")
                            ? "text-teal-300"
                            : analysis.ttmSqueeze.momentumDirection.includes("INCREASING_BEAR")
                            ? "text-rose-400"
                            : "text-amber-300"
                        }`}>
                          {analysis.ttmSqueeze.momentum > 0 ? `+${analysis.ttmSqueeze.momentum}` : analysis.ttmSqueeze.momentum} ({analysis.ttmSqueeze.histogramColor})
                        </span>
                      </div>
                    </>
                  )}

                  {analysis.chaikinMoneyFlow && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Chaikin Money Flow:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.chaikinMoneyFlow.cmf > 0.05
                            ? "text-emerald-400"
                            : analysis.chaikinMoneyFlow.cmf < -0.05
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}>
                          {analysis.chaikinMoneyFlow.cmf > 0 ? `+${analysis.chaikinMoneyFlow.cmf}` : analysis.chaikinMoneyFlow.cmf} ({analysis.chaikinMoneyFlow.capitalFlow.replace("_ACCUMULATION", " สะสม").replace("_DISTRIBUTION", " ระบาย")})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">กระแสเงินสถาบัน:</span>
                        <span className="font-mono text-indigo-300 text-[10px]">
                          {analysis.chaikinMoneyFlow.capitalFlow}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.ttmSqueeze?.description || analysis.chaikinMoneyFlow?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5l. 🧭 Adaptive Trend, Curvature Inflection & Vortex Matrix (Plans 56-60) */}
      {(analysis.kama || analysis.hma || analysis.parabolicSAR || analysis.aroon || analysis.vortex) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-sky-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Adaptive Trend, Zero-Lag Curvature & Vortex Flow Matrix (แผน 56-60)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-300 border border-sky-500/30">
                    🧭 Dynamic Curvature & Flow
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  เครื่องยนต์ปรับสมูท KAMA ไร้ Noise, จุดเลี้ยวความโค้ง Hull MA Zero-Lag, Parabolic SAR Stop-and-Reverse, Aroon วงจรเวลา High/Low และ Vortex Flow ป้องกันการสวนเทรนด์
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: KAMA Adaptive Noise Filter (Plan 56) */}
            {analysis.kama && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎛️ KAMA Adaptive Trend</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.kama.trendState === "BULLISH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.kama.trendState === "BEARISH"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.kama.trendState === "BULLISH"
                      ? "BULLISH KAMA"
                      : analysis.kama.trendState === "BEARISH"
                      ? "BEARISH KAMA"
                      : "FLAT / CHOP"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เส้นราคา KAMA:</span>
                    <span className="font-mono font-bold text-white">
                      {analysis.kama.kamaValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Efficiency Ratio (ER):</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {(analysis.kama.efficiencyRatio * 100).toFixed(1)}% (ทิศทางบริสุทธิ์)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะ Noise กรองตลาด:</span>
                    <span className="font-mono text-emerald-300 text-[10px]">
                      {analysis.kama.trendState === "BULLISH"
                        ? "เทรนด์ขาขึ้น ไร้ Whipsaw"
                        : analysis.kama.trendState === "BEARISH"
                        ? "เทรนด์ขาลง ไร้ Whipsaw"
                        : "ชะลอความเร็วกรอง Noise"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.kama.description}
                </p>
              </div>
            )}

            {/* Card 2: Hull Moving Average Zero-Lag Curvature (Plan 57) */}
            {analysis.hma && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ HMA Zero-Lag</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.hma.isTurningUp
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                      : analysis.hma.isTurningDown
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {analysis.hma.isTurningUp
                      ? "⚡ TURN UP"
                      : analysis.hma.isTurningDown
                      ? "🔻 TURN DOWN"
                      : "STEADY TRAIL"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เส้นเฉลี่ย HMA({analysis.hma.period}):</span>
                    <span className="font-mono font-bold text-white">
                      {analysis.hma.hmaValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ความโค้งจุดเลี้ยว (Inflection):</span>
                    <span className={`font-mono font-bold text-[10px] ${
                      analysis.hma.isTurningUp ? "text-emerald-400" : analysis.hma.isTurningDown ? "text-rose-400" : "text-sky-300"
                    }`}>
                      {analysis.hma.isTurningUp ? "หักหัวขึ้น (กลับตัวซื้อ)" : analysis.hma.isTurningDown ? "หักหัวลง (กลับตัวขาย)" : "คงตัวตามโมเมนตัม"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">คุณลักษณะ Lag:</span>
                    <span className="font-mono text-teal-300 text-[10px]">
                      Zero-Lag Weighted Curve
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.hma.description}
                </p>
              </div>
            )}

            {/* Card 3: Parabolic SAR Trailing & Reversal (Plan 58) */}
            {analysis.parabolicSAR && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 Parabolic SAR Trail</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.parabolicSAR.isReversal
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      : analysis.parabolicSAR.isBullish
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {analysis.parabolicSAR.isReversal
                      ? "🔄 REVERSAL FLIP"
                      : analysis.parabolicSAR.isBullish
                      ? "🟢 BULL TRAIL"
                      : "🔴 BEAR TRAIL"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">จุด Stop-and-Reverse:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.parabolicSAR.sar}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ตำแหน่ง SAR Trailing:</span>
                    <span className="font-mono text-cyan-300 text-[10px]">
                      {analysis.parabolicSAR.isBullish ? "อยู่ใต้ราคา (รองรับขาขึ้น)" : "อยู่เหนือราคา (กดดันขาลง)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะการสลับข้าง:</span>
                    <span className="font-mono text-[10px] text-slate-300">
                      {analysis.parabolicSAR.isReversal ? "⚡ เพิ่งพลิกทิศแท่งล่าสุด" : "รันตามแนวโน้มต่อเนื่อง"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.parabolicSAR.description}
                </p>
              </div>
            )}

            {/* Card 4: Aroon Cycle & Vortex Flow Shield (Plans 59 & 60 + Safety Lock 15) */}
            {(analysis.aroon || analysis.vortex) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌀 Aroon & Vortex Shield</span>
                  {analysis.vortex && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.vortex.safetyLock15Passed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                    }`}>
                      {analysis.vortex.safetyLock15Passed ? "🛡️ LOCK 15 PASS" : "⛔ VORTEX BLOCKED"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  {analysis.aroon && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Aroon Up / Down:</span>
                        <span className="font-mono font-bold text-[10px] text-white">
                          <span className="text-emerald-400">{analysis.aroon.aroonUp}%</span> / <span className="text-rose-400">{analysis.aroon.aroonDown}%</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Aroon Oscillator:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.aroon.oscillator > 20
                            ? "text-emerald-400"
                            : analysis.aroon.oscillator < -20
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}>
                          {analysis.aroon.oscillator > 0 ? `+${analysis.aroon.oscillator}` : analysis.aroon.oscillator} ({analysis.aroon.trendState === "STRONG_UPTREND" ? "เทรนด์ขึ้นแกร่ง" : analysis.aroon.trendState === "STRONG_DOWNTREND" ? "เทรนด์ลงแกร่ง" : "พักตัว"})
                        </span>
                      </div>
                    </>
                  )}

                  {analysis.vortex && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Vortex VI+ vs VI-:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.vortex.trend === "BULLISH" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          VI+ {analysis.vortex.viPlus} / VI- {analysis.vortex.viMinus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">พลังกระแสวนสถาบัน:</span>
                        <span className="font-mono text-indigo-300 text-[10px]">
                          ส่วนต่าง {analysis.vortex.strength} ({analysis.vortex.trend === "BULLISH" ? "ไหลขึ้น" : "ไหลลง"})
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.aroon?.description || analysis.vortex?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5m. ⚡ Gaussian Reversals, Triple Momentum & Volatility Climax Shield (Plans 61-65) */}
      {(analysis.fisher || analysis.connorsRSI || analysis.awesomeOsc || analysis.tsi || analysis.advancedVol) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-violet-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Gaussian Reversals, Triple Momentum & Volatility Climax (แผน 61-65)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/30">
                    ⚡ Gaussian & Multi-Vol
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  Fisher Transform แจกแจงแบบเกาส์, ConnorsRSI ดัก Buy Dip รอย่อสุดขีด, Awesome Oscillator ซอสเซอร์เร่งโมเมนตัม, TSI กรองคลื่น 2 ชั้น และโมเดลความผันผวนหลายมิติ (Lock 16)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Fisher Transform Gaussian Reversal (Plan 61) */}
            {analysis.fisher && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🔮 Fisher Transform</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.fisher.crossSignal === "BULLISH_CROSS"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.fisher.crossSignal === "BEARISH_CROSS"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : analysis.fisher.isExtremeOversold
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.fisher.crossSignal !== "NONE"
                      ? analysis.fisher.crossSignal
                      : analysis.fisher.isExtremeOversold
                      ? "EXTREME OVERSOLD"
                      : analysis.fisher.isExtremeOverbought
                      ? "EXTREME OVERBOUGHT"
                      : "GAUSSIAN BALANCED"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Fisher Value:</span>
                    <span className="font-mono font-bold text-white">
                      {analysis.fisher.fisher > 0 ? `+${analysis.fisher.fisher}` : analysis.fisher.fisher}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">เส้น Trigger Line:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.fisher.trigger > 0 ? `+${analysis.fisher.trigger}` : analysis.fisher.trigger}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">โซน Gaussian ขอบนอก:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.fisher.isExtremeOversold
                        ? "text-emerald-400"
                        : analysis.fisher.isExtremeOverbought
                        ? "text-rose-400"
                        : "text-slate-300"
                    }`}>
                      {analysis.fisher.isExtremeOversold
                        ? "ต่ำกว่า -2.0 (ขายอิ่มตัว)"
                        : analysis.fisher.isExtremeOverbought
                        ? "สูงกว่า +2.0 (ซื้ออิ่มตัว)"
                        : "อยู่ในขอบปกติ (±2.0)"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.fisher.description}
                </p>
              </div>
            )}

            {/* Card 2: ConnorsRSI Triple-Momentum Pullback (Plan 62) */}
            {analysis.connorsRSI && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 ConnorsRSI (CRSI)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.connorsRSI.isExtremePullback
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                      : analysis.connorsRSI.isExtremeOverbought
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.connorsRSI.isExtremePullback
                      ? "🟢 EXTREME DIP BUY"
                      : analysis.connorsRSI.isExtremeOverbought
                      ? "🔴 OVERBOUGHT TOP"
                      : "NORMAL MOMENTUM"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Composite CRSI (0-100):</span>
                    <span className={`font-mono font-bold text-xs ${
                      analysis.connorsRSI.crsi < 15
                        ? "text-emerald-400"
                        : analysis.connorsRSI.crsi > 85
                        ? "text-rose-400"
                        : "text-white"
                    }`}>
                      {analysis.connorsRSI.crsi} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">RSI(3) / StreakRSI:</span>
                    <span className="font-mono text-cyan-300 text-[10px]">
                      {analysis.connorsRSI.rsiClose} / {analysis.connorsRSI.streakRSI}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Percent Rank (100d):</span>
                    <span className="font-mono text-indigo-300 text-[10px]">
                      {analysis.connorsRSI.percentRank}% ของผลตอบแทนรอบ 100 วัน
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.connorsRSI.description}
                </p>
              </div>
            )}

            {/* Card 3: Awesome Oscillator Saucer & Zero Cross (Plan 63) */}
            {analysis.awesomeOsc && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Awesome Oscillator</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.awesomeOsc.saucerSignal === "BULLISH_SAUCER"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.awesomeOsc.saucerSignal === "BEARISH_SAUCER"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : analysis.awesomeOsc.isGreen
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {analysis.awesomeOsc.saucerSignal !== "NONE"
                      ? analysis.awesomeOsc.saucerSignal
                      : analysis.awesomeOsc.isGreen
                      ? "🟢 AO GREEN"
                      : "🔴 AO RED"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ค่าโมเมนตัม AO:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {analysis.awesomeOsc.ao > 0 ? `+${analysis.awesomeOsc.ao}` : analysis.awesomeOsc.ao}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะ Zero Cross:</span>
                    <span className="font-mono text-cyan-300 text-[10px]">
                      {analysis.awesomeOsc.isZeroCross ? "⚡ เพิ่งตัดผ่านเส้น 0" : (analysis.awesomeOsc.ao > 0 ? "อยู่แดนบวก (+)" : "อยู่แดนลบ (-)")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Saucer Acceleration:</span>
                    <span className="font-mono text-[10px] text-slate-300">
                      {analysis.awesomeOsc.saucerSignal === "BULLISH_SAUCER"
                        ? "เร่งสปีดขาขึ้น (Saucer)"
                        : analysis.awesomeOsc.saucerSignal === "BEARISH_SAUCER"
                        ? "เร่งสปีดขาลง (Saucer)"
                        : "เคลื่อนไหวปกติ"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.awesomeOsc.description}
                </p>
              </div>
            )}

            {/* Card 4: TSI & Advanced Volatility Climax Shield (Plans 64 & 65 + Safety Lock 16) */}
            {(analysis.tsi || analysis.advancedVol) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌪️ Volatility Climax Shield</span>
                  {analysis.advancedVol && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.advancedVol.safetyLock16Passed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                    }`}>
                      {analysis.advancedVol.safetyLock16Passed ? "🛡️ LOCK 16 PASS" : "⛔ VOLATILITY CLIMAX"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  {analysis.tsi && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">True Strength Index (TSI):</span>
                      <span className={`font-mono font-bold text-[10px] ${
                        analysis.tsi.isBullish ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {analysis.tsi.tsi > 0 ? `+${analysis.tsi.tsi}` : analysis.tsi.tsi} (Sig: {analysis.tsi.signal})
                      </span>
                    </div>
                  )}

                  {analysis.advancedVol && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Yang-Zhang Volatility:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.advancedVol.yangZhangVol >= 0.45
                            ? "text-rose-400"
                            : analysis.advancedVol.yangZhangVol < 0.15
                            ? "text-cyan-300"
                            : "text-emerald-400"
                        }`}>
                          {(analysis.advancedVol.yangZhangVol * 100).toFixed(1)}% ({analysis.advancedVol.volatilityRegime})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">GK Vol / Ulcer Index:</span>
                        <span className="font-mono text-indigo-300 text-[10px]">
                          GK: {(analysis.advancedVol.garmanKlassVol * 100).toFixed(1)}% | Ulcer: {analysis.advancedVol.ulcerIndex}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.advancedVol?.description || analysis.tsi?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5n. 📐 Channel Envelopes, Turtle Breakouts & VPCI Energy Matrix (Plans 66-70) */}
      {(analysis.keltner || analysis.donchian || analysis.chaikinVol || analysis.ker || analysis.vpci) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-emerald-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Channel Envelopes, Turtle Breakouts & VPCI Energy (แผน 66-70)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30">
                    📐 Envelopes & Volume-Price
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  Keltner Channels ปรับตัวตาม ATR, Donchian Channel ดัก Turtle Breakout 20 แท่ง, Chaikin Volatility วัดสปีดขยายกรอบ, Kaufman KER กรองคลื่นรบกวน, และ VPCI ตรวจจับเบรกเอาท์กลวง (Lock 17)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Keltner Channels ATR Volatility Envelope (Plan 66) */}
            {analysis.keltner && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🗂️ Keltner Channels</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.keltner.isExpanding
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.keltner.isExpanding ? "⚡ BAND EXPANSION" : "CONTRACTING"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Upper / Mid / Lower:</span>
                    <span className="font-mono text-[10px] font-bold text-white">
                      {analysis.keltner.upper} / {analysis.keltner.middle} / {analysis.keltner.lower}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Bandwidth (%BW):</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.keltner.bandwidth}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ตำแหน่งราคา (%B):</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.keltner.percentB > 90
                        ? "text-emerald-400"
                        : analysis.keltner.percentB < 10
                        ? "text-rose-400"
                        : "text-amber-300"
                    }`}>
                      {analysis.keltner.percentB}% {analysis.keltner.percentB > 90 ? "(เหนือกรอบบน)" : analysis.keltner.percentB < 10 ? "(ใต้กรอบล่าง)" : "(ในกรอบ)"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.keltner.description}
                </p>
              </div>
            )}

            {/* Card 2: Donchian Channels & Turtle Breakout Engine (Plan 67) */}
            {analysis.donchian && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🐢 Donchian Breakout</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.donchian.breakoutState === "BULLISH_BREAKOUT_20"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                      : analysis.donchian.breakoutState === "BEARISH_BREAKOUT_20"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : "bg-surface-50 text-slate-400 border border-slate-700"
                  }`}>
                    {analysis.donchian.breakoutState === "BULLISH_BREAKOUT_20"
                      ? "🟢 TURTLE BUY 20"
                      : analysis.donchian.breakoutState === "BEARISH_BREAKOUT_20"
                      ? "🔴 TURTLE SELL 20"
                      : "WITHIN RANGE"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">20-Bar High (Upper):</span>
                    <span className="font-mono font-bold text-emerald-400 text-[10px]">
                      {analysis.donchian.upper}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">20-Bar Low (Lower):</span>
                    <span className="font-mono font-bold text-rose-400 text-[10px]">
                      {analysis.donchian.lower}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Range Width / Mid:</span>
                    <span className="font-mono text-cyan-300 text-[10px]">
                      {analysis.donchian.channelWidth} (Mid: {analysis.donchian.middle})
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.donchian.description}
                </p>
              </div>
            )}

            {/* Card 3: Chaikin Volatility & Kaufman KER Index (Plans 68 & 69) */}
            {(analysis.chaikinVol || analysis.ker) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📊 Chaikin Vol & KER</span>
                  {analysis.ker && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.ker.regime === "HYPER_EFFICIENT_DIRECTED"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : analysis.ker.regime === "SMOOTH_SWING"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : analysis.ker.regime === "ENTANGLED_NOISE"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-surface-50 text-slate-400 border border-slate-700"
                    }`}>
                      {analysis.ker.regime}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.chaikinVol && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Chaikin Volatility (CVOL):</span>
                      <span className={`font-mono font-bold text-[10px] ${
                        analysis.chaikinVol.volatilityTrend === "CLIMAX"
                          ? "text-rose-400 animate-pulse"
                          : analysis.chaikinVol.cvol > 0
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}>
                        {analysis.chaikinVol.cvol > 0 ? `+${analysis.chaikinVol.cvol}%` : `${analysis.chaikinVol.cvol}%`} ({analysis.chaikinVol.volatilityTrend})
                      </span>
                    </div>
                  )}
                  {analysis.ker && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Kaufman Efficiency Ratio:</span>
                        <span className="font-mono font-bold text-amber-300 text-[10px]">
                          {(analysis.ker.efficiencyRatio * 100).toFixed(1)}% (ER: {analysis.ker.efficiencyRatio})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Noise Decoupling Score:</span>
                        <span className="font-mono text-cyan-300 text-[10px]">
                          {analysis.ker.noiseDecouplingScore} / 100 (Signal purity)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.ker?.description || analysis.chaikinVol?.description}
                </p>
              </div>
            )}

            {/* Card 4: VPCI Volume Energy & Safety Lock 17 (Plan 70) */}
            {analysis.vpci && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⛽ VPCI Volume Energy</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.vpci.safetyLock17Passed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.vpci.safetyLock17Passed ? "🛡️ LOCK 17 PASS" : "⛔ HOLLOW BREAKOUT"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">VPCI Indicator:</span>
                    <span className={`font-mono font-bold text-[10px] ${
                      analysis.vpci.vpci > 1.5
                        ? "text-emerald-400"
                        : analysis.vpci.vpci < -1.5
                        ? "text-rose-400"
                        : "text-white"
                    }`}>
                      {analysis.vpci.vpci > 0 ? `+${analysis.vpci.vpci}` : analysis.vpci.vpci}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Signal Line (EMA):</span>
                    <span className="font-mono text-cyan-300 text-[10px]">
                      {analysis.vpci.vpciSignal > 0 ? `+${analysis.vpci.vpciSignal}` : analysis.vpci.vpciSignal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Volume Energy State:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.vpci.volumeEnergyState === "CONFIRMED_TREND"
                        ? "text-emerald-400"
                        : analysis.vpci.volumeEnergyState === "HOLLOW_BREAKOUT"
                        ? "text-rose-400"
                        : "text-amber-300"
                    }`}>
                      {analysis.vpci.volumeEnergyState}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.vpci.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5o. 🌀 Fractal Dynamics, Kinetic Energy & Phase 3 Milestone 75 (Plans 71-75) */}
      {(analysis.mcginley || analysis.elderForce || analysis.rvi || analysis.frama || analysis.milestone75) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-cyan-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Fractal Dynamics, Kinetic Energy & Grand Milestone 75 (แผน 71-75)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
                    🌀 Phase 3 Grand Finale
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  McGinley Dynamic ติดตามสปีดราคาไม่แล็ก, Elder Force Index วัดพลังงานจลน์แรงกระแทก, Relative Volatility Index วัดทิศทางเบี่ยงเบนมาตรฐาน, FRAMA ถอดรหัสมิติแฟร็กทัล Mandelbrot และเกราะ Safety Lock 18
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: John McGinley's McGinley Dynamic (Plan 71) */}
            {analysis.mcginley && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📈 McGinley Dynamic</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.mcginley.trendState === "BULLISH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {analysis.mcginley.trendState === "BULLISH" ? "🟢 BULLISH TRACK" : "🔴 BEARISH TRACK"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">MD Line Value:</span>
                    <span className="font-mono font-bold text-white text-[10px]">
                      {analysis.mcginley.mcginley}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Speed Ratio:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.mcginley.speedRatio}x (Dynamic Factor)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Price Deviation:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.mcginley.deviationPips >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.mcginley.deviationPips >= 0 ? `+${analysis.mcginley.deviationPips}` : analysis.mcginley.deviationPips} pips
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.mcginley.description}
                </p>
              </div>
            )}

            {/* Card 2: Dr. Alexander Elder's Force Index (Plan 72) */}
            {analysis.elderForce && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Elder Force Index</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.elderForce.forceState.includes("BULL")
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.elderForce.forceState}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">EFI Short (2-EMA):</span>
                    <span className={`font-mono font-bold text-[10px] ${analysis.elderForce.efiShort >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {analysis.elderForce.efiShort >= 0 ? `+${analysis.elderForce.efiShort}` : analysis.elderForce.efiShort}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">EFI Long (13-EMA):</span>
                    <span className={`font-mono font-bold text-[10px] ${analysis.elderForce.efiLong >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {analysis.elderForce.efiLong >= 0 ? `+${analysis.elderForce.efiLong}` : analysis.elderForce.efiLong}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kinetic Pulse Trend:</span>
                    <span className="font-mono text-amber-300 text-[10px] font-bold">
                      {analysis.elderForce.efiTrend}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.elderForce.description}
                </p>
              </div>
            )}

            {/* Card 3: Donald Dorsey's RVI & Ehlers' FRAMA (Plans 73 & 74) */}
            {(analysis.rvi || analysis.frama) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌪️ RVI & FRAMA Fractal</span>
                  {analysis.frama && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.frama.state === "TRENDING_SMOOTH"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      D={analysis.frama.fractalDimension}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.rvi && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Relative Volatility (RVI):</span>
                      <span className={`font-mono font-bold text-[10px] ${
                        analysis.rvi.rvi >= 50 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {analysis.rvi.rvi} (Sig: {analysis.rvi.rviSignal})
                      </span>
                    </div>
                  )}
                  {analysis.frama && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">FRAMA Line:</span>
                        <span className="font-mono font-bold text-cyan-300 text-[10px]">
                          {analysis.frama.frama} (α={analysis.frama.alpha})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Mandelbrot Dimension:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          analysis.frama.fractalDimension < 1.4
                            ? "text-emerald-400"
                            : analysis.frama.fractalDimension > 1.7
                            ? "text-rose-400"
                            : "text-amber-300"
                        }`}>
                          {analysis.frama.state}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.frama?.description || analysis.rvi?.description}
                </p>
              </div>
            )}

            {/* Card 4: Grand Milestone 75 Quant Fusion & Safety Lock 18 (Plan 75) */}
            {analysis.milestone75 && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏆 Grand Milestone 75</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.milestone75.safetyLock18Passed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.milestone75.safetyLock18Passed ? "🛡️ LOCK 18 PASS" : "⛔ FRACTAL CHAOS"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Quant Fusion Score:</span>
                    <span className="font-mono font-bold text-amber-300 text-[10px]">
                      {analysis.milestone75.quantScore} / 100 [{analysis.milestone75.milestoneGrade}]
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Phase 3 Dominance:</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {analysis.milestone75.phase3DominanceStatus === "PHASE_3_DOMINANCE_ACHIEVED" ? "🌟 ACHIEVED" : "IN PROGRESS"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Active Pillars / Locks:</span>
                    <span className="font-mono text-emerald-400 text-[10px] font-bold">
                      {analysis.milestone75.activePillarsCount} เสาหลัก / {analysis.milestone75.safetyLocksPassedCount} Locks
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.milestone75.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5p. 🌊 Order Flow Microstructure, VWAP Variance & Liquidity Matrix (Plans 76-80) */}
      {(analysis.orderBookImbalance || analysis.vwapVarianceBands || analysis.volumeVelocity || analysis.icebergOrders || analysis.liquidityMatrix) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-blue-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Order Flow, VWAP Variance & Institutional Liquidity Matrix (แผน 76-80)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30">
                    🌊 Phase 4 Kickoff
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  จำลองความลึก Order Book Imbalance (OBI), VWAP Variance Envelopes (±1σ, ±2σ, ±3σ), Tick Volume Velocity & Acceleration, ดักจับคำสั่งลับ Iceberg Orders และ Institutional Liquidity Matrix พร้อมเกราะ Safety Lock 19
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Market Depth & Order Book Imbalance (Plan 76) */}
            {analysis.orderBookImbalance && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌊 Order Book Imbalance</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.orderBookImbalance.pressureState === "HEAVY_BID_PRESSURE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.orderBookImbalance.pressureState === "HEAVY_ASK_PRESSURE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.orderBookImbalance.pressureState}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Imbalance Ratio:</span>
                    <span className="font-mono font-bold text-white text-[10px]">
                      {analysis.orderBookImbalance.imbalanceRatio.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Bid / Ask Depth:</span>
                    <span className="font-mono text-[10px] font-bold">
                      <span className="text-emerald-400">{analysis.orderBookImbalance.bidDepthPct}%</span>
                      <span className="text-slate-500"> / </span>
                      <span className="text-rose-400">{analysis.orderBookImbalance.askDepthPct}%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Spread Estimate:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.orderBookImbalance.spreadPipsEstimate} pips
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.orderBookImbalance.description}
                </p>
              </div>
            )}

            {/* Card 2: VWAP Variance & Standard Deviation Envelopes (Plan 77) */}
            {analysis.vwapVarianceBands && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🎯 VWAP Variance Envelopes</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.vwapVarianceBands.bandPosition === "INSIDE_SIGMA_1"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.vwapVarianceBands.isMeanReversionZone
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {analysis.vwapVarianceBands.bandPosition}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">VWAP Std Dev (σ):</span>
                    <span className="font-mono font-bold text-white text-[10px]">
                      ±{analysis.vwapVarianceBands.standardDeviation}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">±2σ Envelopes:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.vwapVarianceBands.lowerBand2} - {analysis.vwapVarianceBands.upperBand2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Mean Reversion Zone:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.vwapVarianceBands.isMeanReversionZone ? "text-amber-400" : "text-slate-400"
                    }`}>
                      {analysis.vwapVarianceBands.isMeanReversionZone ? "⚡ REVERSION ZONE" : "NORMAL"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.vwapVarianceBands.description}
                </p>
              </div>
            )}

            {/* Card 3: Tick Volume Velocity & Iceberg Orders (Plans 78 & 79) */}
            {(analysis.volumeVelocity || analysis.icebergOrders) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Volume Velocity & Iceberg</span>
                  {analysis.icebergOrders && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.icebergOrders.isIcebergDetected
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                    }`}>
                      {analysis.icebergOrders.isIcebergDetected ? `🧊 ${analysis.icebergOrders.icebergSide}` : "NO ICEBERG"}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.volumeVelocity && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Volume Velocity:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.volumeVelocity.burstDirection === "BULLISH_BURST" ? "text-emerald-400" : analysis.volumeVelocity.burstDirection === "BEARISH_BURST" ? "text-rose-400" : "text-slate-300"
                        }`}>
                          {analysis.volumeVelocity.velocityRatio}x ({analysis.volumeVelocity.burstDirection})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Acceleration / Climax:</span>
                        <span className="font-mono text-amber-300 font-bold text-[10px]">
                          {analysis.volumeVelocity.accelerationRatio}x | {analysis.volumeVelocity.isVolumeClimax ? "🔥 CLIMAX" : "NORMAL"}
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.icebergOrders && analysis.icebergOrders.isIcebergDetected && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Iceberg Price / Anomaly:</span>
                      <span className="font-mono text-purple-300 font-bold text-[10px]">
                        {analysis.icebergOrders.icebergPrice} ({analysis.icebergOrders.anomalyRatio}x Vol)
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.volumeVelocity?.description || analysis.icebergOrders?.description}
                </p>
              </div>
            )}

            {/* Card 4: Institutional Liquidity Matrix & Safety Lock 19 (Plan 80) */}
            {analysis.liquidityMatrix && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏆 Liquidity Matrix (Gateway)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.liquidityMatrix.safetyLock19Passed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.liquidityMatrix.safetyLock19Passed ? "🛡️ LOCK 19 PASS" : "⛔ LIQUIDITY ABYSS"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Liquidity State:</span>
                    <span className="font-mono font-bold text-amber-300 text-[10px]">
                      {analysis.liquidityMatrix.liquidityState}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Liquidity Score:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.liquidityMatrix.liquidityScore} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Phase 4 Gateway:</span>
                    <span className="font-mono text-emerald-400 text-[10px] font-bold">
                      {analysis.liquidityMatrix.phase4Readiness === "PHASE_4_ORDER_FLOW_ENGAGED" ? "🌊 ENGAGED (80/80)" : "INITIALIZING"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.liquidityMatrix.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5q. ⚡ Advanced Order Flow, Footprint Clusters & Toxic Flow Shield (Plans 81-85) */}
      {(analysis.advancedCVD || analysis.footprintCluster || analysis.vpinToxicity || analysis.liquidityVacuum || analysis.orderFlowFusion) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-violet-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Advanced Order Flow, Footprint Clusters & Toxic Flow Shield (แผน 81-85)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30">
                    ⚡ Grand Milestone 85
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  Cumulative Volume Delta (CVD) Divergence ข้าม Timeframe, Footprint Volume Clusters ตรวจ Bid/Ask Absorption, VPIN Microstructural Toxicity วัดความน่าจะเป็นของ Informed Trading, สแกน Liquidity Vacuum และผสานพลัง Order Flow Fusion พร้อม Safety Lock 20
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Multi-Timeframe CVD Divergence (Plan 81) */}
            {analysis.advancedCVD && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌊 Multi-TF CVD Divergence</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.advancedCVD.divergenceType === "REGULAR_BULLISH" || analysis.advancedCVD.divergenceType === "HIDDEN_BULLISH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.advancedCVD.divergenceType === "REGULAR_BEARISH" || analysis.advancedCVD.divergenceType === "HIDDEN_BEARISH"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.advancedCVD.divergenceType}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Current CVD Delta:</span>
                    <span className={`font-mono font-bold text-[10px] ${
                      analysis.advancedCVD.currentCVD >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.advancedCVD.currentCVD >= 0 ? `+${analysis.advancedCVD.currentCVD}` : analysis.advancedCVD.currentCVD}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Dominant Flow:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.advancedCVD.dominantFlow === "ACCUMULATION_FLOW" ? "text-emerald-400" : analysis.advancedCVD.dominantFlow === "DISTRIBUTION_FLOW" ? "text-rose-400" : "text-amber-300"
                    }`}>
                      {analysis.advancedCVD.dominantFlow}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">EMA Fast / Slow:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.advancedCVD.cvdFastEMA} / {analysis.advancedCVD.cvdSlowEMA} (Slope: {analysis.advancedCVD.slopeDivergenceScore})
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.advancedCVD.description}
                </p>
              </div>
            )}

            {/* Card 2: Bid-Ask Imbalance Footprint Volume Matrix (Plan 82) */}
            {analysis.footprintCluster && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">👣 Footprint Volume Cluster</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.footprintCluster.clusterAbsorptionSide === "BUY_ABSORPTION"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.footprintCluster.clusterAbsorptionSide === "SELL_ABSORPTION"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.footprintCluster.clusterAbsorptionSide}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Bid / Ask Extremes:</span>
                    <span className="font-mono font-bold text-white text-[10px]">
                      <span className="text-emerald-400">Bid {analysis.footprintCluster.lowWickBidVolume}</span> vs <span className="text-rose-400">Ask {analysis.footprintCluster.highWickAskVolume}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Delta / Stacked:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.footprintCluster.deltaAtExtremes >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.footprintCluster.deltaAtExtremes >= 0 ? `+${analysis.footprintCluster.deltaAtExtremes}` : analysis.footprintCluster.deltaAtExtremes} ({analysis.footprintCluster.stackedImbalancesCount} Levels)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Finished Auction:</span>
                    <span className="font-mono text-[10px] font-bold text-slate-300">
                      High: {analysis.footprintCluster.finishedAuctionHigh ? "✅" : "❌"} | Low: {analysis.footprintCluster.finishedAuctionLow ? "✅" : "❌"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.footprintCluster.description}
                </p>
              </div>
            )}

            {/* Card 3: VPIN Microstructural Toxicity & Liquidity Vacuum (Plans 83 & 84) */}
            {(analysis.vpinToxicity || analysis.liquidityVacuum) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🧪 VPIN & Liquidity Vacuum</span>
                  {analysis.vpinToxicity && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.vpinToxicity.isToxicFlowAlert
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                        : analysis.vpinToxicity.toxicityRegime === "BENIGN_FLOW"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {analysis.vpinToxicity.toxicityRegime}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.vpinToxicity && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">VPIN Metric:</span>
                        <span className={`font-mono font-bold text-[10px] ${
                          analysis.vpinToxicity.vpin >= 0.65 ? "text-rose-400" : analysis.vpinToxicity.vpin <= 0.35 ? "text-emerald-400" : "text-amber-300"
                        }`}>
                          {analysis.vpinToxicity.vpin} ({analysis.vpinToxicity.informedTradingProbabilityPct}% Informed)
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.liquidityVacuum && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Vacuum Status:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          analysis.liquidityVacuum.isVacuumDetected ? "text-rose-400 animate-pulse" : "text-slate-300"
                        }`}>
                          {analysis.liquidityVacuum.isVacuumDetected ? `🕳️ ${analysis.liquidityVacuum.vacuumType}` : "NORMAL DEPTH"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Thin Gap / Ghost Quote:</span>
                        <span className="font-mono text-cyan-300 font-bold text-[10px]">
                          {analysis.liquidityVacuum.thinDepthGapSizePips} pips ({analysis.liquidityVacuum.ghostQuoteWithdrawalRate}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.vpinToxicity?.description || analysis.liquidityVacuum?.description}
                </p>
              </div>
            )}

            {/* Card 4: Grand Milestone 85 Order Flow Fusion & Safety Lock 20 (Plan 85) */}
            {analysis.orderFlowFusion && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏆 Grand Milestone 85 Fusion</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.orderFlowFusion.safetyLock20Passed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.orderFlowFusion.safetyLock20Passed ? "🛡️ LOCK 20 PASS" : "⛔ TOXIC FLOW"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Order Flow Score:</span>
                    <span className="font-mono font-bold text-amber-300 text-[10px]">
                      {analysis.orderFlowFusion.orderFlowScore} / 100 [{analysis.orderFlowFusion.milestone85Grade}]
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Flow Dominance:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.orderFlowFusion.flowDominance === "INSTITUTIONAL_BUY_FLOW" ? "text-emerald-400" : analysis.orderFlowFusion.flowDominance === "INSTITUTIONAL_SELL_FLOW" ? "text-rose-400" : "text-slate-300"
                    }`}>
                      {analysis.orderFlowFusion.flowDominance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Active Order Flow Pillars:</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {analysis.orderFlowFusion.activePillarsCount} / 20 เสาหลัก
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.orderFlowFusion.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5r. 🏛️ High-Frequency Microstructure, Micro-Price & Execution Hazard (Plans 86-90) */}
      {(analysis.kylesLambda || analysis.tradeSizeDistribution || analysis.microPrice || analysis.adverseSelection || analysis.executionEngine) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-fuchsia-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>High-Frequency Microstructure, Micro-Price & Execution Hazard (แผน 86-90)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                    🏛️ Grand Milestone 90
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  Kyle&apos;s Lambda วัดสภาพคล่องเปราะบางและ Price Impact, Trade Size Distribution แยกวอลุ่มวาฬ Sovereign, Stoikov Micro-Price คำนวณราคากลางชี้นำคิวคำสั่ง, Adverse Selection Hazard และ Institutional Execution Engine พร้อม Safety Lock 21
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Kyle's Lambda & Price Impact Coefficient (Plan 86) */}
            {analysis.kylesLambda && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">📐 Kyle&apos;s Lambda Impact</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.kylesLambda.fragilityState === "FLASH_SLIPPAGE_ALERT"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : analysis.kylesLambda.fragilityState === "RESILIENT_DEEP_BOOK"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {analysis.kylesLambda.fragilityState}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Lambda (λ):</span>
                    <span className={`font-mono font-bold text-[10px] ${
                      analysis.kylesLambda.lambda >= 0.75 ? "text-rose-400" : analysis.kylesLambda.lambda <= 0.35 ? "text-emerald-400" : "text-amber-300"
                    }`}>
                      λ {analysis.kylesLambda.lambda} (เปราะบาง {analysis.kylesLambda.marketFragilityScore}/100)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Impact / $1M:</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      {analysis.kylesLambda.priceImpactPipsPerMillion} pips
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Safety Lock 21:</span>
                    <span className={`font-mono text-[10px] font-bold ${analysis.kylesLambda.safetyLock21Passed ? "text-emerald-400" : "text-rose-400"}`}>
                      {analysis.kylesLambda.safetyLock21Passed ? "PASSED (Safe Depth)" : "BLOCKED (Flash Slippage)"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.kylesLambda.description}
                </p>
              </div>
            )}

            {/* Card 2: Trade Size Distribution & Whale Aggregator (Plan 87) */}
            {analysis.tradeSizeDistribution && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🐋 Whale Ticket Distribution</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.tradeSizeDistribution.dominantParticipant === "WHALE_SWEEP_ACTIVE"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse"
                      : analysis.tradeSizeDistribution.dominantParticipant === "INSTITUTIONAL_ACCUMULATION"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.tradeSizeDistribution.dominantParticipant}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Inst. Dominance:</span>
                    <span className="font-mono font-bold text-amber-300 text-[10px]">
                      {analysis.tradeSizeDistribution.institutionalDominanceRatio}x (Whale {analysis.tradeSizeDistribution.sovereignWhaleSharePct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Retail vs Inst Block:</span>
                    <span className="font-mono text-[10px] font-bold text-white">
                      <span className="text-slate-400">Micro {analysis.tradeSizeDistribution.retailMicroSharePct}%</span> vs <span className="text-cyan-400">Block {analysis.tradeSizeDistribution.institutionalBlockSharePct}%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Whale Aggression:</span>
                    <span className="font-mono text-emerald-400 text-[10px] font-bold">
                      {analysis.tradeSizeDistribution.whaleAggressionDetected ? "DETECTED (Sweep Active)" : "NORMAL (Passive Flow)"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.tradeSizeDistribution.description}
                </p>
              </div>
            )}

            {/* Card 3: Stoikov Micro-Price & Queue Imbalance Momentum (Plan 88) */}
            {analysis.microPrice && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⏱️ Stoikov Micro-Price</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.microPrice.tickLeadSignal === "PREDICTIVE_UP_TICK"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.microPrice.tickLeadSignal === "PREDICTIVE_DOWN_TICK"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.microPrice.tickLeadSignal}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Stoikov Fair Value:</span>
                    <span className="font-mono font-bold text-white text-[10px]">
                      {analysis.microPrice.microPrice} (Mid: {analysis.microPrice.midPrice})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Deviation / Momentum:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.microPrice.microPriceDeviationPips >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.microPrice.microPriceDeviationPips >= 0 ? `+${analysis.microPrice.microPriceDeviationPips}` : analysis.microPrice.microPriceDeviationPips} pips ({analysis.microPrice.subSpreadMomentum})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Queue Imbalance:</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {analysis.microPrice.queueImbalanceRatio >= 0 ? `+${analysis.microPrice.queueImbalanceRatio}` : analysis.microPrice.queueImbalanceRatio}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.microPrice.description}
                </p>
              </div>
            )}

            {/* Card 4: Grand Milestone 90 Execution Engine & Safety Lock 21 (Plans 89 & 90) */}
            {(analysis.executionEngine || analysis.adverseSelection) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏆 Grand Milestone 90</span>
                  {analysis.executionEngine && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.executionEngine.safetyLock21Passed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                    }`}>
                      {analysis.executionEngine.safetyLock21Passed ? "🛡️ LOCK 21 PASS" : "⛔ ADVERSE RISK"}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.executionEngine && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Execution Score:</span>
                        <span className="font-mono font-bold text-amber-300 text-[10px]">
                          {analysis.executionEngine.executionEfficiencyScore} / 100 [{analysis.executionEngine.milestone90Grade}]
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Execution Readiness:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          analysis.executionEngine.executionReadiness === "CLEARED_FOR_EXECUTION" ? "text-emerald-400" : analysis.executionEngine.executionReadiness === "EXECUTION_BLOCKED" ? "text-rose-400" : "text-amber-300"
                        }`}>
                          {analysis.executionEngine.executionReadiness}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Active Pillars:</span>
                        <span className="font-mono text-cyan-300 text-[10px] font-bold">
                          {analysis.executionEngine.activeMicrostructurePillarsCount} / 21 เสาหลัก
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.adverseSelection && (
                    <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                      <span className="text-slate-400">Adverse Hazard:</span>
                      <span className="font-mono text-[10px] font-bold text-fuchsia-300">
                        {analysis.adverseSelection.hazardState} ({analysis.adverseSelection.recommendedExecutionStyle})
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.executionEngine?.description || analysis.adverseSelection?.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5s. ⚡ Institutional Execution Alpha & Lead-Lag Microstructure (Plans 91-95) */}
      {(analysis.crossMarketLeadLag || analysis.liquidityReplenishment || analysis.permanentPriceImpact || analysis.algoExecutionFootprint || analysis.executionAlpha) && (
        <div className="p-4 rounded-xl bg-surface-100 border border-emerald-500/40 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Institutional Execution Alpha & Lead-Lag Microstructure (แผน 91-95)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30">
                    🏛️ Grand Milestone 95
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  Cross-Market Lead-Lag ตรวจจับสินทรัพย์ชี้นำ, Liquidity Replenishment & Velocity วัดการเติมสภาพคล่องและดักจับการ Spoofing, Hasbrouck Permanent Impact วัดผลกระทบถาวร, Algorithmic Footprint แกะรอย TWAP/VWAP และ Grand Milestone 95 พร้อม Safety Lock 22
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Cross-Market Lead-Lag & Asynchronous Correlation (Plan 91) */}
            {analysis.crossMarketLeadLag && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🌐 Cross-Market Lead-Lag</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.crossMarketLeadLag.leadState === "BENCHMARK_LEADING_BULLISH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.crossMarketLeadLag.leadState === "BENCHMARK_LEADING_BEARISH"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.crossMarketLeadLag.leadState}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Predictive Lead:</span>
                    <span className={`font-mono font-bold text-[10px] ${
                      analysis.crossMarketLeadLag.predictiveLeadPips >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {analysis.crossMarketLeadLag.predictiveLeadPips >= 0 ? `+${analysis.crossMarketLeadLag.predictiveLeadPips}` : analysis.crossMarketLeadLag.predictiveLeadPips} pips ({analysis.crossMarketLeadLag.leadLagLagPeriods} bars lag)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Lead Correlation (r):</span>
                    <span className="font-mono text-cyan-300 font-bold text-[10px]">
                      r = {analysis.crossMarketLeadLag.leadCorrelationCoefficient.toFixed(2)} ({analysis.crossMarketLeadLag.crossAssetBenchmark})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Safety Lock 22:</span>
                    <span className={`font-mono text-[10px] font-bold ${analysis.crossMarketLeadLag.safetyLock22Passed ? "text-emerald-400" : "text-rose-400"}`}>
                      {analysis.crossMarketLeadLag.safetyLock22Passed ? "PASSED (Safe Lead)" : "ADVERSE LEAD RISK"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.crossMarketLeadLag.description}
                </p>
              </div>
            )}

            {/* Card 2: Liquidity Replenishment & Cancellation Velocity (Plan 92) */}
            {analysis.liquidityReplenishment && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">⚡ Replenishment Velocity</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.liquidityReplenishment.liquidityStickiness === "STICKY_COMMITTED_DEPTH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.liquidityReplenishment.liquidityStickiness === "HIGH_PHANTOM_SPOOFING"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {analysis.liquidityReplenishment.liquidityStickiness}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Velocity Score:</span>
                    <span className="font-mono font-bold text-amber-300 text-[10px]">
                      {analysis.liquidityReplenishment.replenishmentVelocityScore} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Half-Life / Cancel:</span>
                    <span className="font-mono text-[10px] font-bold text-white">
                      <span className="text-cyan-400">{analysis.liquidityReplenishment.replenishmentHalfLifeSeconds}s</span> / <span className="text-rose-400">Cancel {analysis.liquidityReplenishment.cancellationRatePct}%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Spoofing Detection:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.liquidityReplenishment.spoofingAlert ? "text-rose-400 animate-pulse" : "text-emerald-400"
                    }`}>
                      {analysis.liquidityReplenishment.spoofingAlert ? "⛔ HIGH SPOOFING ALERT" : "CLEAN COMMITTED DEPTH"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.liquidityReplenishment.description}
                </p>
              </div>
            )}

            {/* Card 3: Algorithmic TWAP/VWAP Tracker & Hasbrouck Permanent Impact (Plans 93 & 94) */}
            {(analysis.algoExecutionFootprint || analysis.permanentPriceImpact) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🤖 Algo Footprint & Impact</span>
                  {analysis.algoExecutionFootprint && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysis.algoExecutionFootprint.algoType !== "NONE"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                    }`}>
                      {analysis.algoExecutionFootprint.algoType}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.algoExecutionFootprint && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Algo Bias / Cadence:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          analysis.algoExecutionFootprint.institutionalExecutionBias === "ALGO_BUYING_PROGRAM"
                            ? "text-emerald-400"
                            : analysis.algoExecutionFootprint.institutionalExecutionBias === "ALGO_SELLING_PROGRAM"
                            ? "text-rose-400"
                            : "text-slate-400"
                        }`}>
                          {analysis.algoExecutionFootprint.institutionalExecutionBias} (Cadence {analysis.algoExecutionFootprint.cadenceRegularityScore}/100)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Remaining / Part. Rate:</span>
                        <span className="font-mono text-cyan-300 text-[10px] font-bold">
                          ~{analysis.algoExecutionFootprint.estimatedRemainingBars} bars (Part: {analysis.algoExecutionFootprint.participationRatePct}%)
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.permanentPriceImpact && (
                    <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                      <span className="text-slate-400">Hasbrouck Impact:</span>
                      <span className="font-mono text-[10px] font-bold text-amber-300">
                        Permanent {(analysis.permanentPriceImpact.permanentImpactRatio * 100).toFixed(0)}% (Informed {analysis.permanentPriceImpact.informationAsymmetryPct}%)
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.algoExecutionFootprint?.description || analysis.permanentPriceImpact?.description}
                </p>
              </div>
            )}

            {/* Card 4: Grand Milestone 95 Institutional Execution Alpha & Safety Lock 22 (Plan 95) */}
            {analysis.executionAlpha && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">🏆 Grand Milestone 95</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    analysis.executionAlpha.safetyLock22Passed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.executionAlpha.safetyLock22Passed ? "🛡️ LOCK 22 PASS" : "⛔ PHANTOM / ADVERSE LEAD"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Execution Alpha:</span>
                    <span className="font-mono font-bold text-amber-300 text-[10px]">
                      {analysis.executionAlpha.executionAlphaScore} / 100 [{analysis.executionAlpha.milestone95Grade}]
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Recommendation:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.executionAlpha.executionAlphaRecommendation === "AGGRESSIVE_FRONT_RUN_ALGO"
                        ? "text-emerald-400"
                        : analysis.executionAlpha.executionAlphaRecommendation === "HALT_SPOOFING_ALERT"
                        ? "text-rose-400"
                        : "text-amber-300"
                    }`}>
                      {analysis.executionAlpha.executionAlphaRecommendation}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Active Pillars:</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {analysis.executionAlpha.activeMicrostructurePillarsCount} / 22 เสาหลัก
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                    <span className="text-slate-400">Progress:</span>
                    <span className="font-mono text-[10px] font-bold text-fuchsia-300">
                      {analysis.executionAlpha.phase4Progress}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.executionAlpha.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5t. 🌌 Grand Quantum Singularity Alpha Engine (Plans 96-100: Grand Milestone 100 Final Frontier) */}
      {(analysis.quantumProbabilityVector || analysis.multiFractalHurst || analysis.fillProbabilitySlippage || analysis.darkPoolDealerGamma || analysis.sovereignSingularityAlpha) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/30 via-surface-100 to-indigo-950/30 border border-purple-500/40 space-y-3.5 shadow-lg shadow-purple-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>🌌 Grand Quantum Singularity Alpha Engine (แผน 96-100)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white border border-purple-400 shadow-sm animate-pulse">
                    Milestone 100 Finale (100% Roadmap Complete)
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400">
                  พลวัต Quantum Waveform Collapse, Multifractal Hurst Cascades, Dark Pool GEX และเกราะคุ้มกันสูงสุด Master Singularity Shield
                </p>
              </div>
            </div>
            {analysis.sovereignSingularityAlpha && (
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-mono font-black ${
                  analysis.sovereignSingularityAlpha.safetyLock23Passed
                    ? "bg-purple-500/20 text-purple-200 border-purple-400/50"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                }`}>
                  {analysis.sovereignSingularityAlpha.safetyLock23Passed ? "🛡️ MASTER SINGULARITY SHIELD: PASSED" : "⛔ DECOHERENCE / GEX ALERT"}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Quantum Probability State Vector & Waveform Collapse (Plan 96) */}
            {analysis.quantumProbabilityVector && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-purple-200">🔮 Quantum Probability Vector</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    analysis.quantumProbabilityVector.collapseState === "SUPERPOSITION_RESOLVING_BULLISH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.quantumProbabilityVector.collapseState === "SUPERPOSITION_RESOLVING_BEARISH"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {analysis.quantumProbabilityVector.collapseState === "SUPERPOSITION_RESOLVING_BULLISH"
                      ? "↑ |Up⟩ Collapse"
                      : analysis.quantumProbabilityVector.collapseState === "SUPERPOSITION_RESOLVING_BEARISH"
                      ? "↓ |Down⟩ Collapse"
                      : "Ψ Superposition"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Amplitudes |ψ|²:</span>
                    <span className="font-mono text-[10px] font-bold">
                      <span className="text-emerald-400">{(analysis.quantumProbabilityVector.stateVector.psiUp * 100).toFixed(0)}% Up</span> / <span className="text-rose-400">{(analysis.quantumProbabilityVector.stateVector.psiDown * 100).toFixed(0)}% Dn</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Coherence / Horizon:</span>
                    <span className="font-mono text-[10px] font-bold text-white">
                      <span className="text-cyan-400">{analysis.quantumProbabilityVector.quantumCoherenceScore}/100</span> (~{analysis.quantumProbabilityVector.decoherenceTimeframeBars} bars)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">von Neumann Entropy:</span>
                    <span className="font-mono text-[10px] font-bold text-indigo-300">
                      {analysis.quantumProbabilityVector.shannonVonNeumannEntropy} bits
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.quantumProbabilityVector.description}
                </p>
              </div>
            )}

            {/* Card 2: Cross-Timeframe Multi-Fractal Hurst Cascades (Plan 97) */}
            {analysis.multiFractalHurst && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-indigo-200">🧬 Multi-Fractal Hurst Cascades</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    analysis.multiFractalHurst.cascadePersistenceState === "PERSISTENT_MULTIFRACTAL_SUPER_TREND"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : analysis.multiFractalHurst.cascadePersistenceState === "ANTIPERSISTENT_MEAN_REVERTING"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                  }`}>
                    {analysis.multiFractalHurst.cascadePersistenceState === "PERSISTENT_MULTIFRACTAL_SUPER_TREND"
                      ? "⚡ Super-Trend"
                      : analysis.multiFractalHurst.cascadePersistenceState === "ANTIPERSISTENT_MEAN_REVERTING"
                      ? "🔄 Mean-Reverting"
                      : "🎲 Monofractal"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">H(q) Spectrum:</span>
                    <span className="font-mono text-[10px] font-bold text-white">
                      H(2): <span className="text-amber-300">{analysis.multiFractalHurst.generalizedHurstQ2}</span> | H(0): {analysis.multiFractalHurst.generalizedHurstQ0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Spectrum Width Δα:</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {analysis.multiFractalHurst.singularitySpectrumWidth} (Cascade: {analysis.multiFractalHurst.timeframeCascadesConfluencePct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Left-Tail H(-2):</span>
                    <span className="font-mono text-slate-300 text-[10px] font-bold">
                      {analysis.multiFractalHurst.generalizedHurstQMinus2}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.multiFractalHurst.description}
                </p>
              </div>
            )}

            {/* Card 3: Fill Probability & Slippage (Plan 98) & Dark Pool Gamma (Plan 99) */}
            {(analysis.fillProbabilitySlippage || analysis.darkPoolDealerGamma) && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-cyan-200">🎯 Slippage & Dark Pool GEX</span>
                  {analysis.darkPoolDealerGamma && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      analysis.darkPoolDealerGamma.gammaRegime === "POSITIVE_GAMMA_VOLATILITY_SUPPRESSION"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : analysis.darkPoolDealerGamma.gammaRegime === "NEGATIVE_GAMMA_VOLATILITY_EXPLOSION"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                        : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                    }`}>
                      {analysis.darkPoolDealerGamma.gammaRegime === "POSITIVE_GAMMA_VOLATILITY_SUPPRESSION"
                        ? "+GEX Suppression"
                        : analysis.darkPoolDealerGamma.gammaRegime === "NEGATIVE_GAMMA_VOLATILITY_EXPLOSION"
                        ? "-GEX Explosion"
                        : "GEX Neutral"}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {analysis.fillProbabilitySlippage && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Fill Prob / Slippage:</span>
                        <span className="font-mono text-[10px] font-bold text-white">
                          <span className="text-emerald-400">{analysis.fillProbabilitySlippage.limitFillProbabilityPct}%</span> (~{analysis.fillProbabilitySlippage.forecastedSlippagePips} pips)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Exec Style:</span>
                        <span className="font-mono text-cyan-300 text-[10px] font-bold">
                          {analysis.fillProbabilitySlippage.recommendedExecutionStyle}
                        </span>
                      </div>
                    </>
                  )}
                  {analysis.darkPoolDealerGamma && (
                    <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                      <span className="text-slate-400">GEX Score / Pin Strike:</span>
                      <span className="font-mono text-[10px] font-bold text-amber-300">
                        {analysis.darkPoolDealerGamma.netDealerGammaExposureScore} (Pin: {analysis.darkPoolDealerGamma.estimatedPinningStrike})
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.fillProbabilitySlippage?.description || analysis.darkPoolDealerGamma?.description}
                </p>
              </div>
            )}

            {/* Card 4: Grand Milestone 100 Sovereign Singularity Alpha & Safety Lock 23 (Plan 100) */}
            {analysis.sovereignSingularityAlpha && (
              <div className="p-3 rounded-xl bg-surface-100/90 border border-purple-400/50 space-y-2 shadow-sm shadow-purple-500/10">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-fuchsia-300 font-black flex items-center gap-1">
                    <span>🌌</span> Grand Milestone 100
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-black ${
                    analysis.sovereignSingularityAlpha.safetyLock23Passed
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white border border-purple-400 shadow-sm"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  }`}>
                    {analysis.sovereignSingularityAlpha.safetyLock23Passed ? "👑 S-TIER SINGULARITY" : "⛔ SHIELD LOCK 23"}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Sovereign Alpha:</span>
                    <span className="font-mono font-black text-amber-300 text-[10px]">
                      {analysis.sovereignSingularityAlpha.sovereignAlphaScore} / 100 [{analysis.sovereignSingularityAlpha.milestone100Grade}]
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Convergence:</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      analysis.sovereignSingularityAlpha.singularityState === "SINGULARITY_CONVERGENCE_BUY"
                        ? "text-emerald-400"
                        : analysis.sovereignSingularityAlpha.singularityState === "SINGULARITY_CONVERGENCE_SELL"
                        ? "text-rose-400"
                        : "text-amber-300"
                    }`}>
                      {analysis.sovereignSingularityAlpha.singularityState}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Active Pillars:</span>
                    <span className="font-mono text-cyan-300 text-[10px] font-bold">
                      {analysis.sovereignSingularityAlpha.activeQuantPillarsCount} / 23 เสาหลัก (100 Indicators)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                    <span className="text-slate-400">Recommendation:</span>
                    <span className="font-mono text-[10px] font-bold text-fuchsia-300">
                      {analysis.sovereignSingularityAlpha.singularityRecommendation}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                  {analysis.sovereignSingularityAlpha.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}