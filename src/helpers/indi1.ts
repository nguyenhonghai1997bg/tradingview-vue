import { type Candle, type Marker } from "@/helpers/indicators";

/**
 * Tìm swing high/low theo period
 */
export function findSwingPoints(data: Candle[], period = 5) {
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = period; i < data.length - period; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const leftHigh = data.slice(i - period, i).every(d => d.high < high);
    const rightHigh = data.slice(i + 1, i + 1 + period).every(d => d.high < high);
    const leftLow = data.slice(i - period, i).every(d => d.low > low);
    const rightLow = data.slice(i + 1, i + 1 + period).every(d => d.low > low);
    if (leftHigh && rightHigh) highs.push(i);
    if (leftLow && rightLow) lows.push(i);
  }

  return { highs, lows };
}

/**
 * Fibo retracement
 */
export function getFiboLevels(high: number, low: number) {
  const diff = high - low;
  return {
    0: low,
    0.382: high - diff * 0.382,
    0.5: high - diff * 0.5,
    0.618: high - diff * 0.618,
    1: high,
  };
}

/**
 * Xác nhận hồi Fibo
 */
export function confirmFiboRetracement(data: Candle[], start: number, end: number): boolean {
  const high = Math.max(...data.slice(start, end).map(d => d.high));
  const low = Math.min(...data.slice(start, end).map(d => d.low));
  const fibo = getFiboLevels(high, low);
  const recent = data[end]?.low ?? data[end]?.high;
  return recent >= fibo[0.5] && recent <= fibo[0.618];
}

/**
 * Break of Structure (BOS)
 */
export function detectBos(data: Candle[], highs: number[], lows: number[]): { bosUp: number[]; bosDown: number[] } {
  const bosUp: number[] = [];
  const bosDown: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const prevHighIdx = highs.filter(h => h < i).pop();
    const prevLowIdx = lows.filter(l => l < i).pop();

    if (prevHighIdx && data[i].close > data[prevHighIdx].high * 1.001) bosUp.push(i);
    if (prevLowIdx && data[i].close < data[prevLowIdx].low * 0.999) bosDown.push(i);
  }

  return { bosUp, bosDown };
}

/**
 * Head & Shoulders Pattern Detection
 */
export function detectHnsPattern(data: Candle[], highs: number[]) {
  const indices: number[] = [];
  for (let i = 2; i < highs.length; i++) {
    const [l, h, r] = [highs[i - 2], highs[i - 1], highs[i]];
    if (!data[l] || !data[h] || !data[r]) continue;
    const left = data[l].high, head = data[h].high, right = data[r].high;
    if (head > left && head > right && Math.abs(left - right) / head < 0.06) indices.push(r);
  }
  return indices;
}

/**
 * Inverse Head & Shoulders Pattern Detection
 */
export function detectInverseHnsPattern(data: Candle[], lows: number[]) {
  const indices: number[] = [];
  for (let i = 2; i < lows.length; i++) {
    const [l, h, r] = [lows[i - 2], lows[i - 1], lows[i]];
    if (!data[l] || !data[h] || !data[r]) continue;
    const left = data[l].low, head = data[h].low, right = data[r].low;
    if (head < left && head < right && Math.abs(left - right) / Math.abs(head) < 0.06) indices.push(r);
  }
  return indices;
}


/**
 * Phát hiện marker cho Head & Shoulders
 */
export function detectHnsMarkers(data: Candle[], highs: number[], bosDown: number[]): Marker[] {
  const markers: Marker[] = [];
  const indices = detectHnsPattern(data, highs);

  for (const i of indices) {
    const hasBosDown = bosDown.some(b => b > i && b <= i + 10);
    const fiboOk = confirmFiboRetracement(data, i - 10, i);
    if (!hasBosDown && !fiboOk) continue;

    markers.push({
      time: data[i].time,
      position: "aboveBar",
      color: "#ef5350",
      shape: "arrowDown",
      text: "SHORT (Indi1)",
      price: data[i].close,
    });
  }

  return markers;
}

/**
 * Phát hiện marker cho Inverse Head & Shoulders
 */
export function detectInverseHnsMarkers(data: Candle[], lows: number[], bosUp: number[]): Marker[] {
  const markers: Marker[] = [];
  const indices = detectInverseHnsPattern(data, lows);

  for (const i of indices) {
    const hasBosUp = bosUp.some(b => b > i && b <= i + 10);
    const fiboOk = confirmFiboRetracement(data, i - 10, i);
    if (!hasBosUp && !fiboOk) continue;

    markers.push({
      time: data[i].time,
      position: "belowBar",
      color: "#26a69a",
      shape: "arrowUp",
      text: "LONG (Indi1)",
      price: data[i].close,
    });
  }

  return markers;
}



export function indi1Marker(data: Candle[]): Marker[] {
  const { highs, lows } = findSwingPoints(data, 5);
  const { bosUp, bosDown } = detectBos(data, highs, lows);

  let lastSignal: "LONG" | "SHORT" | null = null;
  const markers: Marker[] = [];
  
  // Tín hiệu H&S
  const hnsMarkers = detectHnsMarkers(data, highs, bosDown);
  for (const marker of hnsMarkers) {
    if (lastSignal === "LONG") {
      markers.push({
        time: data[data.findIndex(d => d.time === marker.time) - 1]?.time || marker.time,
        position: "belowBar",
        color: "#ff9800",
        shape: "circle",
        text: "CLOSE LONG",
        price: data[data.findIndex(d => d.time === marker.time) - 1]?.close || marker.price,
      });
    }
    markers.push(marker);
    lastSignal = "SHORT";
  }

  // Tín hiệu Inverse H&S
  const inverseHnsMarkers = detectInverseHnsMarkers(data, lows, bosUp);
  for (const marker of inverseHnsMarkers) {
    if (lastSignal === "SHORT") {
      markers.push({
        time: data[data.findIndex(d => d.time === marker.time) - 1]?.time || marker.time,
        position: "aboveBar",
        color: "#2196f3",
        shape: "circle",
        text: "CLOSE SHORT",
        price: data[data.findIndex(d => d.time === marker.time) - 1]?.close || marker.price,
      });
    }
    markers.push(marker);
    lastSignal = "LONG";
  }

  return markers;
}