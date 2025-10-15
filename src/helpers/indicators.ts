import type { CandlestickData } from "lightweight-charts";
import { calculateFibonacci, calculateKDJ, calculateMACD, calculateRSI, calculateStochRSI, calculateStochRSI_KD } from "@/helpers/tradingview_indicator";
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

// Hàm kiểm tra xem giá có gần một mức nào đó không (threshold là phần trăm của giá)
export function isNearLevel(price: number, levels: number[], thresholdPercent: number = 0.005): boolean {
  return levels.some(level => Math.abs(price - level) / level <= thresholdPercent);
}

// Hammer Pattern (Bullish Reversal)
export function isHammer(candle: Candle): boolean {
  const body = Math.abs(candle.close - candle.open);
  const lowerWick = candle.open > candle.close ? candle.open - candle.low : candle.close - candle.low;
  const upperWick = candle.open > candle.close ? candle.high - candle.open : candle.high - candle.close;

  return (
    lowerWick > 2 * body &&
    upperWick < body &&
    body > 0
  );
}

// Shooting Star Pattern (Bearish Reversal)
export function isShootingStar(candle: Candle): boolean {
  const body = Math.abs(candle.close - candle.open);
  const lowerWick = candle.open > candle.close ? candle.open - candle.low : candle.close - candle.low;
  const upperWick = candle.open > candle.close ? candle.high - candle.open : candle.high - candle.close;

  return (
    upperWick > 2 * body &&
    lowerWick < body &&
    body > 0
  );
}

// Bullish Engulfing Pattern
export function isBullishEngulfing(prevCandle: Candle, currCandle: Candle): boolean {
  return (
    prevCandle.close < prevCandle.open && // Previous candle is bearish
    currCandle.close > currCandle.open &&  // Current candle is bullish
    currCandle.open < prevCandle.close &&
    currCandle.close > prevCandle.open
  );
}

// Bearish Engulfing Pattern
export function isBearishEngulfing(prevCandle: Candle, currCandle: Candle): boolean {
  return (
    prevCandle.close > prevCandle.open && // Previous candle is bullish
    currCandle.close < currCandle.open &&  // Current candle is bearish
    currCandle.open > prevCandle.close &&
    currCandle.close < prevCandle.open
  );
}

// Hàm mới để tìm các mức hỗ trợ và kháng cự (dựa trên swing highs/lows đơn giản)
export function findSupportResistance(data: any[], window: number = 20): { supports: { time: any, price: number }[], resistances: { time: any, price: number }[] } {
  const supports: { time: any, price: number }[] = [];
  const resistances: { time: any, price: number }[] = [];

  for (let i = window; i < data.length - window; i++) {
    const slice = data.slice(i - window, i + window + 1);
    
    // Tìm swing low cho hỗ trợ
    const localMin = Math.min(...slice.map(c => c.low));
    if (data[i].low === localMin) {
      supports.push({ time: data[i].time, price: localMin });
    }
    
    // Tìm swing high cho kháng cự
    const localMax = Math.max(...slice.map(c => c.high));
    if (data[i].high === localMax) {
      resistances.push({ time: data[i].time, price: localMax });
    }
  }

  return { supports, resistances };
}

export const generateSignals = (candlestickData: CandlestickData[]) => {
  // Extract price arrays for indicator calculations
  const closePrices = candlestickData.map(c => c.close);
  const highPrices = candlestickData.map(c => c.high);
  const lowPrices = candlestickData.map(c => c.low);

  // Calculate indicators
  const rsi = calculateRSI(closePrices, 14); // RSI with 14-period
  const stochRSI = calculateStochRSI(rsi, 14); // StochRSI with 14-period
  const { rsiK, rsiD } = calculateStochRSI_KD(stochRSI, 3, 3); // StochRSI %K and %D
  const { macd, signal } = calculateMACD(closePrices, 12, 26, 9); // MACD
  const { k, d } = calculateKDJ(highPrices, lowPrices, closePrices, 9, 3); // KDJ
  const { supports, resistances } = findSupportResistance(candlestickData, 20); // Support/Resistance

  // Tích hợp thêm Fibonacci để bổ sung cho các mức hỗ trợ/kháng cự
  let fiboLevels: number[] = [];
  if (supports.length > 0 && resistances.length > 0) {
    // Lấy mức hỗ trợ và kháng cự gần nhất (dựa trên time)
    const latestSupport = supports.reduce((prev, curr) => (curr.time > prev.time ? curr : prev), supports[0]);
    const latestResistance = resistances.reduce((prev, curr) => (curr.time > prev.time ? curr : prev), resistances[0]);

    // Xác định start và end dựa trên thời gian để quyết định uptrend/downtrend
    const start = latestSupport.time < latestResistance.time ? latestSupport.price : latestResistance.price;
    const end = latestSupport.time < latestResistance.time ? latestResistance.price : latestSupport.price;

    const fibos = calculateFibonacci(start, end);
    fiboLevels = fibos.map(f => f.value);
  }

  // Kết hợp các mức hỗ trợ/kháng cự với Fibonacci
  const combinedSupports = [...supports.map(s => s.price), ...fiboLevels.filter(level => level <= Math.min(...closePrices.slice(-20)))];
  const combinedResistances = [...resistances.map(r => r.price), ...fiboLevels.filter(level => level >= Math.max(...closePrices.slice(-20)))];

  // Generate markers
  const markers = candlestickData.map((candle, index) => {
    if (index === 0) return null; // Skip first candle for patterns requiring prevCandle
    const prevCandle = candlestickData[index - 1];
    const currentCandle: Candle = {
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };

    // Check candlestick patterns
    const isHammerPattern = isHammer(currentCandle);
    const isShootingStarPattern = isShootingStar(currentCandle);
    const isBullishEngulfingPattern = prevCandle && isBullishEngulfing(prevCandle, currentCandle);
    const isBearishEngulfingPattern = prevCandle && isBearishEngulfing(prevCandle, currentCandle);

    // Check proximity to combined support/resistance (kết hợp thêm fibo)
    const isNearSupport = isNearLevel(currentCandle.low, combinedSupports, 0.005);
    const isNearResistance = isNearLevel(currentCandle.high, combinedResistances, 0.005);

    // Indicator conditions
    const isRSIOverbought = rsi[index] >= 70;
    const isRSIOversold = rsi[index] <= 30;
    const isStochRSIOverbought = rsiK[index] >= 80;
    const isStochRSIOversold = rsiK[index] <= 20;
    const isMACDBullishCrossover = macd[index] > signal[index] && macd[index - 1] <= signal[index - 1];
    const isMACDBearishCrossover = macd[index] < signal[index] && macd[index - 1] >= signal[index - 1];
    const isKDJBullish = k[index] > d[index] && k[index] <= 30; // KDJ in oversold and bullish
    const isKDJBearish = k[index] < d[index] && k[index] >= 70; // KDJ in overbought and bearish

    // Signal scoring (require at least two confirming conditions)
    let bullishScore = 0;
    let bearishScore = 0;

    // Bullish conditions (kết hợp thêm với support/fibo)
    if (isHammerPattern && isNearSupport) bullishScore += 2;
    if (isBullishEngulfingPattern && isNearSupport) bullishScore += 2;
    if (isRSIOversold) bullishScore += 1;
    if (isStochRSIOversold) bullishScore += 1;
    if (isMACDBullishCrossover) bullishScore += 1;
    if (isKDJBullish) bullishScore += 1;

    // Bearish conditions (kết hợp thêm với resistance/fibo)
    if (isShootingStarPattern && isNearResistance) bearishScore += 2;
    if (isBearishEngulfingPattern && isNearResistance) bearishScore += 2;
    if (isRSIOverbought) bearishScore += 1;
    if (isStochRSIOverbought) bearishScore += 1;
    if (isMACDBearishCrossover) bearishScore += 1;
    if (isKDJBearish) bearishScore += 1;

    // Generate signal if score meets threshold (e.g., >= 3)
    if (bullishScore >= 3) {
      return {
        time: candle.time,
        position: 'belowBar',
        color: '#26a69a', // Green for LONG
        shape: 'arrowUp',
        text: 'LONG',
      };
    }
    if (bearishScore >= 3) {
      return {
        time: candle.time,
        position: 'aboveBar',
        color: '#ef5350', // Red for SHORT
        shape: 'arrowDown',
        text: 'SHORT',
      };
    }

    return null;
  }).filter(marker => marker !== null);

  return markers;
};
