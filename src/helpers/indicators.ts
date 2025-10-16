import type { CandlestickData } from "lightweight-charts";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Tìm local extrema (swing high/low)
 */
function findSwingPoints(data: Candle[], window: number = 3) {
  const highs: { index: number; price: number }[] = [];
  const lows: { index: number; price: number }[] = [];

  for (let i = window; i < data.length - window; i++) {
    const slice = data.slice(i - window, i + window + 1);
    const max = Math.max(...slice.map(c => c.high));
    const min = Math.min(...slice.map(c => c.low));

    if (data[i]?.high === max) highs.push({ index: i, price: max });
    if (data[i]?.low === min) lows.push({ index: i, price: min });
  }

  return { highs, lows };
}

/**
 * Phát hiện mô hình Vai–Đầu–Vai (Head and Shoulders)
 * Dựa trên 3 đỉnh liên tiếp có dạng: vai trái < đầu > vai phải
 */
function detectHeadAndShoulders(highs: { index: number; price: number }[]): number[] {
  const signals: number[] = [];

  for (let i = 2; i < highs.length; i++) {
    const left = highs[i - 2];
    const head = highs[i - 1];
    const right = highs[i];

    if (
      head && right && left &&
      head.price > left.price &&
      head.price > right.price &&
      Math.abs(left.price - right.price) / head.price < 0.03 && // Vai cân đối
      right.index - left.index <= 20 // Khoảng cách hợp lý
    ) {
      signals.push(head.index);
    }
  }

  return signals;
}

/**
 * Phát hiện mô hình Vai–Đầu–Vai Ngược (Inverse Head and Shoulders)
 * Dựa trên 3 đáy liên tiếp có dạng: vai trái > đầu < vai phải
 */
function detectInverseHeadAndShoulders(lows: { index: number; price: number }[]): number[] {
  const signals: number[] = [];

  for (let i = 2; i < lows.length; i++) {
    const left = lows[i - 2];
    const head = lows[i - 1];
    const right = lows[i];

    if (
      head && right && left &&
      head.price < left.price &&
      head.price < right.price &&
      Math.abs(left.price - right.price) / head.price < 0.03 &&
      right.index - left.index <= 20
    ) {
      signals.push(head.index);
    }
  }

  return signals;
}

/**
 * Hàm chính: sinh tín hiệu LONG/SHORT dựa vào mô hình giá lớn
 */
export const generateSignals = (candlestickData: CandlestickData[]) => {
  const data: Candle[] = candlestickData.map(c => ({
    time: Number(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  if (data.length < 30) return [];

  // Tìm các swing high/low
  const { highs, lows } = findSwingPoints(data, 3);

  // Phát hiện mô hình
  const hnsIndices = detectHeadAndShoulders(highs);
  const inverseHnsIndices = detectInverseHeadAndShoulders(lows);

  // Tạo markers
  const markers = [
    ...hnsIndices.flatMap(i => ({
      time: Number(data[i]?.time) || 0,
      position: "aboveBar",
      color: "#ef5350",
      shape: "arrowDown",
      text: "SHORT (H&S)",
      price: Number(data[i]?.close) || 0,
    })),
    ...inverseHnsIndices.flatMap(i => ({
      time: Number(data[i]?.time) || 0,
      position: "belowBar",
      color: "#26a69a",
      shape: "arrowUp",
      text: "LONG (Inv H&S)",
      price: Number(data[i]?.close) || 0,
    })),
  ].sort((a, b) => a.time - b.time);

  return markers;
};
