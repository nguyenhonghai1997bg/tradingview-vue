import { type Candle, type Marker } from "@/helpers/indicators";

/**
 * Tìm swing high/low theo period
 * Lưu ý: chỉ dùng dữ liệu quá khứ (left side). Không dùng dữ liệu tương lai.
 */
export function findSwingPoints(data: Candle[], period = 5) {
  const highs: number[] = [];
  const lows: number[] = [];

  // Chỉ đảm bảo có đủ dữ liệu quá khứ để kiểm tra (không cần dữ liệu tương lai)
  for (let i = period; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;

    const leftHigh = data.slice(i - period, i).every(d => d.high < high);
    const leftLow = data.slice(i - period, i).every(d => d.low > low);

    if (leftHigh) highs.push(i);
    if (leftLow) lows.push(i);
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
 * Xác nhận hồi Fibo (real-time safe)
 * - start: index bắt đầu (inclusive)
 * - end: index kết thúc (inclusive) — nhưng hàm sẽ chỉ xem tới `currentIndex`
 * Tránh sử dụng nến nằm > currentIndex (tức là tương lai).
 */
export function confirmFiboRetracement(
  data: Candle[],
  start: number,
  end: number,
  currentIndex?: number
): boolean {
  const lastIndex = currentIndex ?? data.length - 1;
  if (start < 0) start = 0;
  if (end < start) return false;

  // chỉ xét dữ liệu đến lastIndex (không nhìn tương lai)
  const cappedEnd = Math.min(end, lastIndex);

  const slice = data.slice(start, cappedEnd + 1); // inclusive
  if (slice.length === 0) return false;

  const high = Math.max(...slice.map(d => d.high));
  const low = Math.min(...slice.map(d => d.low));
  const fibo = getFiboLevels(high, low);

  // Lấy nến "gần nhất" (cappedEnd) làm giá kiểm tra
  const recent = data[cappedEnd];
  if (!recent) return false;

  // Kiểm tra giá low (hoặc close) nằm trong vùng 0.5-0.618
  const checkPrice = recent.low ?? recent.close ?? recent.high;
  // Giả định đây là Fibo Retracement từ xu hướng GIẢM (tìm đáy)
  // Nếu là Fibo Retracement từ xu hướng TĂNG (tìm đỉnh), cần đảo ngược fibo levels.
  // Tuy nhiên, vì Fibo đang được dùng để xác nhận pullback, logic này tạm ổn.
  // Quan trọng: vùng 0.5-0.618 phải nằm giữa high và low của swing.
  const level05 = Math.min(fibo[0.5], fibo[0.618]);
  const level0618 = Math.max(fibo[0.5], fibo[0.618]);

  return checkPrice >= level05 && checkPrice <= level0618;
}

/**
 * Break of Structure (BOS) - real-time safe
 * Chỉ dùng các swing indices đã xảy ra < = currentIndex
 */
export function detectBos(
  data: Candle[],
  highs: number[],
  lows: number[],
  currentIndex?: number
): { bosUp: number[]; bosDown: number[] } {
  const bosUp: number[] = [];
  const bosDown: number[] = [];
  const lastIndex = currentIndex ?? data.length - 1;

  for (let i = 1; i <= lastIndex; i++) {
    // tìm prev high/low tồn tại trước i
    const prevHighIdx = highs.filter(h => h < i && h <= lastIndex).pop();
    const prevLowIdx = lows.filter(l => l < i && l <= lastIndex).pop();

    if (prevHighIdx !== undefined && data[i] && data[prevHighIdx]) {
      // BOS up: close vượt qua high trước đó (thêm 0.1% tolerance)
      if (data[i].close > data[prevHighIdx].high * 1.001) bosUp.push(i);
    }

    if (prevLowIdx !== undefined && data[i] && data[prevLowIdx]) {
      // BOS down: close xuống dưới low trước đó
      if (data[i].close < data[prevLowIdx].low * 0.999) bosDown.push(i);
    }
  }

  return { bosUp, bosDown };
}

/**
 * Head & Shoulders Pattern Detection - real-time safe
 * - Tìm pattern chỉ khi "right shoulder" đã xảy ra (r <= lastIndex).
 * - Trả về index của right shoulder (r).
 * FILTERING: Giảm tolerance cân bằng vai từ 6% xuống 5%.
 */
export function detectHnsPattern(
  data: Candle[],
  highs: number[],
  currentIndex?: number
) {
  const indices: number[] = [];
  const lastIndex = currentIndex ?? data.length - 1;

  for (let i = 2; i < highs.length; i++) {
    const l = highs[i - 2];
    const h = highs[i - 1];
    const r = highs[i];

    // đảm bảo tất cả indices nằm trong dữ liệu đã xảy ra
    if (l === undefined || h === undefined || r === undefined) continue;
    if (r > lastIndex) continue; // right shoulder chưa xảy ra => skip (tránh future)

    const left = data[l]?.high;
    const head = data[h]?.high;
    const right = data[r]?.high;
    if (left === undefined || head === undefined || right === undefined) continue;

    // head phải lớn hơn 2 vai và 2 vai tương đối cân bằng (dưới 5% khác biệt)
    if (head > left && head > right && Math.abs(left - right) / head < 0.05) {
      indices.push(r);
    }
  }

  return indices;
}

/**
 * Inverse Head & Shoulders Pattern Detection - real-time safe
 * Tương tự detectHnsPattern nhưng với lows
 * FILTERING: Giảm tolerance cân bằng vai từ 6% xuống 5%.
 */
export function detectInverseHnsPattern(
  data: Candle[],
  lows: number[],
  currentIndex?: number
) {
  const indices: number[] = [];
  const lastIndex = currentIndex ?? data.length - 1;

  for (let i = 2; i < lows.length; i++) {
    const l = lows[i - 2];
    const h = lows[i - 1];
    const r = lows[i];

    if (l === undefined || h === undefined || r === undefined) continue;
    if (r > lastIndex) continue; // right shoulder chưa xảy ra

    const left = data[l]?.low;
    const head = data[h]?.low;
    const right = data[r]?.low;
    if (left === undefined || head === undefined || right === undefined) continue;

    // head phải nhỏ hơn 2 vai và 2 vai tương đối cân bằng (dưới 5% khác biệt)
    if (head < left && head < right && Math.abs(left - right) / Math.abs(head) < 0.05) {
      indices.push(r);
    }
  }

  return indices;
}

/**
 * Phát hiện marker cho Head & Shoulders - real-time safe
 * FILTERING: YÊU CẦU CẢ BOS DOWN VÀ FIBO RETRACEMENT (AND condition)
 */
export function detectHnsMarkers(
  data: Candle[],
  highs: number[],
  bosDown: number[],
  currentIndex?: number
): Marker[] {
  const markers: Marker[] = [];
  const lastIndex = currentIndex ?? data.length - 1;
  const indices = detectHnsPattern(data, highs, lastIndex);

  for (const r of indices) {
    // tìm head index index h (vai trái là l)
    const pos = highs.indexOf(r);
    if (pos < 2) continue;
    const hIdx = highs[pos - 1];

    // BOS đã xảy ra sau head nhưng trước hoặc tại lastIndex
    const hasBosDownAlready = bosDown.some(b => b > hIdx && b <= lastIndex);

    // Fibo retracement đã xảy ra trước lastIndex trong vùng [hIdx-10, r]
    // Đây là vùng pullback sau khi hình thành Head
    const fiboOk = confirmFiboRetracement(data, Math.max(0, hIdx - 10), r, lastIndex);

    // --- BỘ LỌC CHÍNH (AND condition) ---
    // Chỉ tạo marker nếu CẢ BOS DOWN đã xảy ra VÀ Fibo đã xác nhận.
    if (!hasBosDownAlready || !fiboOk) continue;

    const markerPrice = data[r]?.close ?? data[r]?.high ?? 0;
    markers.push({
      time: data[r].time,
      position: "aboveBar",
      color: "#ef5350",
      shape: "arrowDown",
      text: "SHORT (Indi1 - Hi-Conf)",
      price: markerPrice,
    });
  }

  return markers;
}

/**
 * Phát hiện marker cho Inverse Head & Shoulders - real-time safe
 * FILTERING: YÊU CẦU CẢ BOS UP VÀ FIBO RETRACEMENT (AND condition)
 */
export function detectInverseHnsMarkers(
  data: Candle[],
  lows: number[],
  bosUp: number[],
  currentIndex?: number
): Marker[] {
  const markers: Marker[] = [];
  const lastIndex = currentIndex ?? data.length - 1;
  const indices = detectInverseHnsPattern(data, lows, lastIndex);

  for (const r of indices) {
    const pos = lows.indexOf(r);
    if (pos < 2) continue;
    const hIdx = lows[pos - 1];

    const hasBosUpAlready = bosUp.some(b => b > hIdx && b <= lastIndex);
    const fiboOk = confirmFiboRetracement(data, Math.max(0, hIdx - 10), r, lastIndex);

    // --- BỘ LỌC CHÍNH (AND condition) ---
    // Chỉ tạo marker nếu CẢ BOS UP đã xảy ra VÀ Fibo đã xác nhận.
    if (!hasBosUpAlready || !fiboOk) continue;

    const markerPrice = data[r]?.close ?? data[r]?.low ?? 0;
    markers.push({
      time: data[r].time,
      position: "belowBar",
      color: "#26a69a",
      shape: "arrowUp",
      text: "LONG (Indi1 - Hi-Conf)",
      price: markerPrice,
    });
  }

  return markers;
}

/**
 * Main: tạo marker cho indi1 — realtime-safe
 * - Tạo marker chỉ dựa trên candles đã đóng (data[0..lastIndex])
 */
export function indi1Marker(data: Candle[]): Marker[] {
  const lastIndex = data.length - 1;
  if (lastIndex < 1) return [];

  // tìm swing từ dữ liệu hiện có (dựa trên left-side only)
  const { highs, lows } = findSwingPoints(data, 5);

  // detect BOS dựa trên swing hiện có (tính đến lastIndex)
  const { bosUp, bosDown } = detectBos(data, highs, lows, lastIndex);

  let lastSignal: "LONG" | "SHORT" | null = null;
  const markers: Marker[] = [];

  // Tín hiệu H&S (chỉ khi right shoulder đã xảy ra và có xác nhận)
  const hnsMarkers = detectHnsMarkers(data, highs, bosDown, lastIndex);
  for (const marker of hnsMarkers) {
    // Nếu đang giữ LONG trước đó -> tạo marker đóng LONG ngay trước signal này (nến liền trước nếu có)
    const idx = data.findIndex(d => d.time === marker.time);
    const closeIdx = idx > 0 ? idx - 1 : idx;
    if (lastSignal === "LONG") {
      markers.push({
        time: data[closeIdx]?.time ?? marker.time,
        position: "belowBar",
        color: "#ff9800",
        shape: "circle",
        text: "CLOSE LONG",
        price: data[closeIdx]?.close ?? marker.price,
      });
    }
    markers.push(marker);
    lastSignal = "SHORT";
  }

  // Tín hiệu Inverse H&S
  const inverseHnsMarkers = detectInverseHnsMarkers(data, lows, bosUp, lastIndex);
  for (const marker of inverseHnsMarkers) {
    const idx = data.findIndex(d => d.time === marker.time);
    const closeIdx = idx > 0 ? idx - 1 : idx;
    if (lastSignal === "SHORT") {
      markers.push({
        time: data[closeIdx]?.time ?? marker.time,
        position: "aboveBar",
        color: "#2196f3",
        shape: "circle",
        text: "CLOSE SHORT",
        price: data[closeIdx]?.close ?? marker.price,
      });
    }
    markers.push(marker);
    lastSignal = "LONG";
  }

  return markers;
}
