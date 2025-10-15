export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, val) => sum + val, 0) / period;
    result.push(avg);
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return result;

  // Tính SMA ban đầu
  const initialSlice = data.slice(0, period);
  const initialEMA = initialSlice.reduce((sum, val) => sum + val, 0) / period;
  result[period - 1] = initialEMA;

  const multiplier = 2 / (period + 1);
  let ema = initialEMA;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result[i] = ema;
  }
  return result;
}

// 1️⃣ Tính RSI
export function calculateRSI(data: number[], period = 14): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period + 1) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  gains /= period;
  losses /= period;
  result[period] = 100 - 100 / (1 + gains / (losses || 0.0001));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    gains = (gains * (period - 1) + gain) / period;
    losses = (losses * (period - 1) + loss) / period;

    const rs = gains / (losses || 0.0001);
    result[i] = 100 - 100 / (1 + rs);
  }

  return result;
}

// 2️⃣ Tính StochRSI
export function calculateStochRSI(rsi: number[], stochPeriod = 14): number[] {
  const result: number[] = new Array(rsi.length).fill(NaN);

  for (let i = stochPeriod; i < rsi.length; i++) {
    const slice = rsi.slice(i - stochPeriod, i + 1).filter(v => !isNaN(v));
    if (slice.length < stochPeriod) continue;

    const minRSI = Math.min(...slice);
    const maxRSI = Math.max(...slice);
    const currentRSI = rsi[i];

    result[i] = maxRSI === minRSI ? 0 : (currentRSI - minRSI) / (maxRSI - minRSI);
  }

  return result;
}

// 3️⃣ Tính %K và %D (3,3)
export function calculateStochRSI_KD(stochRSI: number[], kPeriod = 3, dPeriod = 3) {
  const rsiK: number[] = new Array(stochRSI.length).fill(NaN);
  const rsiD: number[] = new Array(stochRSI.length).fill(NaN);

  for (let i = kPeriod - 1; i < stochRSI.length; i++) {
    const sliceK = stochRSI.slice(i - kPeriod + 1, i + 1);
    rsiK[i] = sliceK.reduce((a, b) => a + b, 0) / kPeriod;
  }

  for (let i = dPeriod - 1; i < rsiK.length; i++) {
    const sliceD = rsiK.slice(i - dPeriod + 1, i + 1);
    rsiD[i] = sliceD.reduce((a, b) => a + b, 0) / dPeriod;
  }

  return { rsiK, rsiD };
}

export function calculateMACD(
  data: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const length = data.length;
  const macd: number[] = new Array(length).fill(NaN);
  const signal: number[] = new Array(length).fill(NaN);
  const histogram: number[] = new Array(length).fill(NaN);

  if (length < slowPeriod) return { macd, signal, histogram };

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // === Bước 1: tính MACD
  for (let i = 0; i < length; i++) {
    if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
      macd[i] = fastEMA[i] - slowEMA[i];
    }
  }

  // === Bước 2: lấy phần MACD hợp lệ để tính EMA signal
  const validMacd = macd.filter(v => !isNaN(v));
  const signalRaw = calculateEMA(validMacd, signalPeriod);

  // === Bước 3: gắn signal trở lại vị trí tương ứng
  let validIndex = 0;
  for (let i = 0; i < length; i++) {
    if (!isNaN(macd[i])) {
      signal[i] = signalRaw[validIndex++];
      if (!isNaN(signal[i])) {
        histogram[i] = macd[i] - signal[i];
      }
    }
  }

  return { macd, signal, histogram };
}

export function calculateKDJ(
  high: number[],
  low: number[],
  close: number[],
  kPeriod = 9,
  dPeriod = 3
) {
  const kArr: number[] = [];
  const dArr: number[] = [];
  const jArr: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod - 1) {
      kArr.push(NaN);
      dArr.push(NaN);
      jArr.push(NaN);
      continue;
    }

    const periodHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
    const periodLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));
    const currentClose = close[i];

    let rsv: number;
    if (periodHigh === periodLow) {
      rsv = 50;
    } else {
      rsv = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;
    }

    const prevK = (i > 0 && !isNaN(kArr[i - 1])) ? kArr[i - 1] : 50;
    const prevD = (i > 0 && !isNaN(dArr[i - 1])) ? dArr[i - 1] : 50;

    const k = (2 / 3) * prevK + (1 / 3) * rsv;
    const d = (2 / 3) * prevD + (1 / 3) * k;
    const j = 3 * k - 2 * d;

    kArr.push(k);
    dArr.push(d);
    jArr.push(j);
  }

  return { k: kArr, d: dArr, j: jArr };
}


export interface FiboLevel {
  level: number;   // tỷ lệ fibo (0.236, 0.382, ...)
  value: number;   // giá trị thật tương ứng trên chart
}
export function calculateFibonacci(start: number, end: number): FiboLevel[] {
  const fiboLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const high = Math.max(start, end);
  const low = Math.min(start, end);
  const diff = high - low;

  return fiboLevels.map(level => ({
    level,
    value: start > end 
      ? start - diff * level // downtrend
      : start + diff * level // uptrend
  }));
}