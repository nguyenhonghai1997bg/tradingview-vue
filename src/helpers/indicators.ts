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
 * Phát hiện mô hình Vai–Đầu–Vai (xác nhận)
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
      Math.abs(left.price - right.price) / head.price < 0.03 &&
      right.index - left.index <= 20
    ) {
      signals.push(head.index);
    }
  }

  return signals;
}

/**
 * Phát hiện mô hình Vai–Đầu–Vai Ngược (xác nhận)
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
 * Dự đoán mô hình Vai–Đầu–Vai đang hình thành
 * Chỉ sử dụng dữ liệu trước đó (left và head) để dự đoán
 */
function predictHeadAndShoulders(highs: { index: number; price: number }[]): number[] {
  const predictions: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const left = highs[i - 1];
    const head = highs[i];

    if (
      head && left &&
      head.price > left.price * 1.02 && // Đầu cao hơn vai trái ít nhất 2%
      head.index - left.index <= 20
    ) {
      // Dự đoán dựa trên vai trái và đầu, không cần vai phải
      predictions.push(head.index);
    }
  }
  return predictions;
}

/**
 * Dự đoán mô hình Vai–Đầu–Vai Ngược đang hình thành
 * Chỉ sử dụng dữ liệu trước đó (left và head) để dự đoán
 */
function predictInverseHeadAndShoulders(lows: { index: number; price: number }[]): number[] {
  const predictions: number[] = [];
  for (let i = 1; i < lows.length; i++) {
    const left = lows[i - 1];
    const head = lows[i];

    if (
      head && left &&
      head.price < left.price * 0.98 && // Đầu thấp hơn vai trái ít nhất 2%
      head.index - left.index <= 20
    ) {
      // Dự đoán dựa trên vai trái và đầu, không cần vai phải
      predictions.push(head.index);
    }
  }
  return predictions;
}

/**
 * Hàm chính: sinh tín hiệu LONG/SHORT (xác nhận và dự đoán)
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

  const { highs, lows } = findSwingPoints(data, 3);

  // Mô hình đã xác nhận
  const hnsIndices = detectHeadAndShoulders(highs);
  const inverseHnsIndices = detectInverseHeadAndShoulders(lows);

  // Mô hình đang hình thành
  const predictedHns = predictHeadAndShoulders(highs);
  const predictedInverseHns = predictInverseHeadAndShoulders(lows);

  // Marker
  const markers = [
    // ✅ Xác nhận SHORT
    ...hnsIndices.map(i => ({
      time: Number(data[i]?.time) || 0,
      position: "aboveBar" as const,
      color: "#ef5350",
      shape: "arrowDown",
      text: "SHORT (H&S)",
      price: Number(data[i]?.close) || 0,
    })),

    // ✅ Xác nhận LONG
    ...inverseHnsIndices.map(i => ({
      time: Number(data[i]?.time) || 0,
      position: "belowBar" as const,
      color: "#26a69a",
      shape: "arrowUp",
      text: "LONG (Inv H&S)",
      price: Number(data[i]?.close) || 0,
    })),

    // ⚠️ Dự đoán SHORT
    ...predictedHns.map(i => ({
      time: Number(data[i]?.time) || 0,
      position: "aboveBar" as const,
      color: "#ffca28",
      shape: "circle",
      text: "H&S forming",
      price: Number(data[i]?.close) || 0,
    })),

    // ⚠️ Dự đoán LONG
    ...predictedInverseHns.map(i => ({
      time: Number(data[i]?.time) || 0,
      position: "belowBar" as const,
      color: "#ffca28",
      shape: "circle",
      text: "Inv H&S forming",
      price: Number(data[i]?.close) || 0,
    })),
  ].sort((a, b) => a.time - b.time);

  // Lọc trùng theo time
  const uniqueMarkers = Array.from(
    new Map(markers.map(m => [m.time, m])).values()
  );

  return uniqueMarkers;
};
