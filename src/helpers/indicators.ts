import type { CandlestickData } from "lightweight-charts";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Marker {
  time: number;
  position: string;
  color: string;
  shape: string;
  text: string;
  price: number;
}

/**
 * Tìm swing high/low theo period nhất định (mặc định = 5)
 */
function findSwingPoints(data: Candle[], period = 5) {
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
 * Phát hiện mô hình Head & Shoulders
 */
function detectHnsPattern(data: Candle[], highs: number[]) {
  const indices: number[] = [];
  for (let i = 2; i < highs.length; i++) {
    const [l, h, r] = [highs[i - 2], highs[i - 1], highs[i]];
    if (!data[l] || !data[h] || !data[r]) continue;

    const left = data[l].high;
    const head = data[h].high;
    const right = data[r].high;

    // Head phải cao hơn 2 vai
    if (head > left && head > right && Math.abs(left - right) / head < 0.03) {
      indices.push(r);
    }
  }
  return indices;
}

/**
 * Phát hiện mô hình Inverse Head & Shoulders
 */
function detectInverseHnsPattern(data: Candle[], lows: number[]) {
  const indices: number[] = [];
  for (let i = 2; i < lows.length; i++) {
    const [l, h, r] = [lows[i - 2], lows[i - 1], lows[i]];
    if (!data[l] || !data[h] || !data[r]) continue;

    const left = data[l].low;
    const head = data[h].low;
    const right = data[r].low;

    // Head phải thấp hơn 2 vai
    if (head < left && head < right && Math.abs(left - right) / head < 0.03) {
      indices.push(r);
    }
  }
  return indices;
}

/**
 * Hàm chính: sinh tín hiệu LONG, SHORT và CLOSE
 */
export const generateSignals = (candlestickData: CandlestickData[]): Marker[] => {
  const data: Candle[] = candlestickData.map(c => ({
    time: Number(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  if (data.length < 30) return [];

  const { highs, lows } = findSwingPoints(data, 5);
  const hnsIndices = detectHnsPattern(data, highs);
  const inverseHnsIndices = detectInverseHnsPattern(data, lows);

  const markers: Marker[] = [];
  let lastSignal: "LONG" | "SHORT" | null = null;

  // SHORT: Head & Shoulders
  for (const i of hnsIndices) {
    if (lastSignal === "LONG") {
      // Đóng lệnh LONG trước đó
      markers.push({
        time: data[i - 1]?.time || data[i].time,
        position: "belowBar",
        color: "#ff9800",
        shape: "circle",
        text: "CLOSE LONG",
        price: data[i - 1]?.close || data[i].close,
      });
    }

    // Mở SHORT
    markers.push({
      time: data[i].time,
      position: "aboveBar",
      color: "#ef5350",
      shape: "arrowDown",
      text: "SHORT (H&S)",
      price: data[i].close,
    });

    lastSignal = "SHORT";
  }

  // LONG: Inverse H&S
  for (const i of inverseHnsIndices) {
    if (lastSignal === "SHORT") {
      // Đóng lệnh SHORT trước đó
      markers.push({
        time: data[i - 1]?.time || data[i].time,
        position: "aboveBar",
        color: "#2196f3",
        shape: "circle",
        text: "CLOSE SHORT",
        price: data[i - 1]?.close || data[i].close,
      });
    }

    // Mở LONG
    markers.push({
      time: data[i].time,
      position: "belowBar",
      color: "#26a69a",
      shape: "arrowUp",
      text: "LONG (Inverse H&S)",
      price: data[i].close,
    });

    lastSignal = "LONG";
  }

  // Sắp xếp & lọc trùng theo time
  const unique = new Map<number, Marker>();
  for (const m of markers) {
    if (!unique.has(m.time)) unique.set(m.time, m);
  }

  return Array.from(unique.values()).sort((a, b) => a.time - b.time);
};
