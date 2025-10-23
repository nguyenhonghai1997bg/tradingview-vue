
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
// helper: EMA nhưng giữ NaN trước khi đủ dữ liệu (giữ nguyên từ trước)
function emaWithNan(data: number[], period: number): number[] {
  const n = data.length;
  const result: number[] = new Array(n).fill(NaN);
  if (period <= 0 || n === 0) return result;

  let startIndex = -1;
  for (let i = period - 1; i < n; i++) {
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      if (isNaN(data[j])) {
        ok = false;
        break;
      }
    }
    if (ok) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return result;

  // initial SMA
  let sum = 0;
  for (let j = startIndex - period + 1; j <= startIndex; j++) sum += data[j];
  let prevEma = sum / period;
  result[startIndex] = prevEma;

  const multiplier = 2 / (period + 1);
  for (let i = startIndex + 1; i < n; i++) {
    const val = data[i];
    if (isNaN(val)) {
      result[i] = NaN;
      continue;
    }
    prevEma = (val - prevEma) * multiplier + prevEma;
    result[i] = prevEma;
  }

  return result;
}

/**
 * Robust SMIIO with selectable scaling:
 * mode: "percent" => [-100, +100] (classic SMI scaled)
 *       "normalized" => [-1, +1]
 *       "zeroOne" => [0, 1] (DNSE-like)
 */
export function calculateSMIIO(
  high: number[],
  low: number[],
  close: number[],
  period = 14,
  smoothA = 3,
  smoothB = 3,
  signalPeriod = 3,
  mode: "percent" | "normalized" | "zeroOne" = "normalized"
) {
  const n = close.length;
  const smi: number[] = new Array(n).fill(NaN);
  const smiSignal: number[] = new Array(n).fill(NaN);
  const smiHistogram: number[] = new Array(n).fill(NaN);

  if (!high || !low || !close || high.length !== n || low.length !== n) {
    return { smi, smiSignal, smiHistogram };
  }
  if (n === 0) return { smi, smiSignal, smiHistogram };

  // compute diff = close - midpoint, range = (hh - ll) / 2  (same as trước)
  const diffArr: number[] = new Array(n).fill(NaN);
  const rangeArr: number[] = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      diffArr[i] = NaN;
      rangeArr[i] = NaN;
      continue;
    }
    const sliceHigh = high.slice(i - period + 1, i + 1);
    const sliceLow = low.slice(i - period + 1, i + 1);
    if (sliceHigh.some(isNaN) || sliceLow.some(isNaN)) {
      diffArr[i] = NaN;
      rangeArr[i] = NaN;
      continue;
    }
    const hh = Math.max(...sliceHigh);
    const ll = Math.min(...sliceLow);
    const mid = (hh + ll) / 2;
    diffArr[i] = close[i] - mid;
    rangeArr[i] = (hh - ll) / 2;
  }

  // double smoothing with safe EMA
  const diffEMA1 = emaWithNan(diffArr, smoothA);
  const diffEMA2 = emaWithNan(diffEMA1, smoothB);
  const rangeEMA1 = emaWithNan(rangeArr, smoothA);
  const rangeEMA2 = emaWithNan(rangeEMA1, smoothB);

  // compute a small robust floor for denominator:
  // use median absolute of rangeEMA2 (ignoring NaN) * small factor as backup
  const validRanges = rangeEMA2.filter((v) => !isNaN(v) && Math.abs(v) > 0);
  const tiny = 1e-10;
  let avgRange = 0;
  if (validRanges.length) {
    // use mean of absolute validRanges as a stable scale
    avgRange = validRanges.reduce((s, x) => s + Math.abs(x), 0) / validRanges.length;
  }

  const epsFactor = 1e-3; // floor = max(abs(range), avgRange * epsFactor, tiny)
  const floorFromAvg = avgRange * epsFactor;

  for (let i = 0; i < n; i++) {
    const d = diffEMA2[i];
    const r = rangeEMA2[i];
    if (isNaN(d) || isNaN(r)) {
      smi[i] = NaN;
      continue;
    }
    const denom = Math.max(Math.abs(r), floorFromAvg, tiny);
    let raw = d / denom; // raw can be large if denom tiny; we clamped denom

    // Now scale according to mode:
    if (mode === "percent") {
      // scale to ±100, but clamp to avoid huge spikes
      raw = raw * 100;
      // clamp to reasonable bounds
      const clampMax = 500; // avoid outliers
      if (raw > clampMax) raw = clampMax;
      if (raw < -clampMax) raw = -clampMax;
      smi[i] = raw;
    } else if (mode === "normalized") {
      // scale to [-1, 1] using tanh to compress outliers smoothly
      smi[i] = Math.tanh(raw); // keeps in (-1,1)
    } else {
      // zeroOne: map normalized [-1,1] -> [0,1]
      smi[i] = 0.5 * (1 + Math.tanh(raw));
    }
  }

  // signal line: EMA of smi (use emaWithNan — note: for "percent" the smi values are larger)
  const smiForSignal = smi.map((v) => (isNaN(v) ? NaN : v));
  const smiSignalRaw = emaWithNan(smiForSignal, signalPeriod);
  for (let i = 0; i < n; i++) {
    smiSignal[i] = smiSignalRaw[i];
    if (!isNaN(smi[i]) && !isNaN(smiSignal[i])) {
      smiHistogram[i] = smi[i] - smiSignal[i];
    } else {
      smiHistogram[i] = NaN;
    }
  }

  return { smi, smiSignal, smiHistogram };
}
