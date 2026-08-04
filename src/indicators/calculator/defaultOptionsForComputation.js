/** Conventional settings for each indicator — the numbers most charts start from. */

export const BollingerBand = { windowSize: 20, sourcePath: "close", multiplier: 2, movingAverageType: "sma" }
export const ATR = { windowSize: 14 }
export const ForceIndex = { sourcePath: "close", volumePath: "volume" }
export const SmoothedForceIndex = {
    sourcePath: "close",
    volumePath: "volume",
    smoothingType: "ema",
    smoothingWindow: 13,
}
export const Change = { sourcePath: "close", basePath: "close", mainKeys: [], compareKeys: [] }
export const Compare = { basePath: "close", mainKeys: ["open", "high", "low", "close"], compareKeys: [] }
export const ElderRay = { windowSize: 13, sourcePath: "close", movingAverageType: "sma" }
export const ElderImpulse = { sourcePath: "close" }
export const SAR = { accelerationFactor: 0.02, maxAccelerationFactor: 0.2 }
export const MACD = { fast: 12, slow: 26, signal: 9, sourcePath: "close" }
export const FullStochasticOscillator = { windowSize: 12, kWindowSize: 3, dWindowSize: 3 }
export const RSI = { windowSize: 14, sourcePath: "close" }
export const EMA = { sourcePath: "close", windowSize: 10 }
export const SMA = { sourcePath: "close", windowSize: 10 }
export const WMA = { sourcePath: "close", windowSize: 10 }
export const TMA = { sourcePath: "close", windowSize: 10 }
export const Kagi = { reversalType: "ATR", windowSize: 14, reversal: 2, sourcePath: "close" }
export const Renko = { reversalType: "ATR", windowSize: 14, fixedBrickSize: 2, sourcePath: "high/low" }
export const PointAndFigure = { boxSize: 0.5, reversal: 3, sourcePath: "high/low" }
