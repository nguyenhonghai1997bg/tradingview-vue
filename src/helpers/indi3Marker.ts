import type { Candle, Marker } from "./path_to_your_types";

/**
 * ATR (Average True Range)
 */
function calculateATR(data: Candle[], period = 10): number[] {
  const atr: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      atr.push(NaN);
      continue;
    }
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    if (i < period) {
      atr.push(NaN);
    } else if (i === period) {
      const sum = data
        .slice(1, period + 1)
        .map((d, j) =>
          Math.max(
            d.high - d.low,
            Math.abs(d.high - data[j].close),
            Math.abs(d.low - data[j].close)
          )
        )
        .reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      atr.push(((atr[i - 1] * (period - 1)) + tr) / period);
    }
  }
  return atr;
}

/**
 * SuperTrend + Marker generator
 */
export function indi3Marker(
  data: Candle[],
  atrPeriod = 10,
  multiplier = 3
): Marker[] {
  const markers: Marker[] = [];
  if (data.length <= atrPeriod) return markers;

  const atr = calculateATR(data, atrPeriod);

  let prevUpper = 0;
  let prevLower = 0;
  let supertrend: number[] = [];
  let trendUp = true; // trạng thái hiện tại

  for (let i = 0; i < data.length; i++) {
    if (i < atrPeriod) {
      supertrend.push(NaN);
      continue;
    }

    const hl2 = (data[i].high + data[i].low) / 2;
    const currATR = atr[i];

    const upperBand = hl2 + multiplier * currATR;
    const lowerBand = hl2 - multiplier * currATR;

    // Giữ continuity cho band
    const finalUpper = i > 0 && upperBand < prevUpper ? upperBand : prevUpper || upperBand;
    const finalLower = i > 0 && lowerBand > prevLower ? lowerBand : prevLower || lowerBand;

    let currTrendUp = trendUp;

    // Logic đảo chiều xu hướng
    if (data[i].close > prevUpper) currTrendUp = true;
    else if (data[i].close < prevLower) currTrendUp = false;

    // Nếu đảo chiều → marker
    if (currTrendUp !== trendUp && i > atrPeriod) {
      if (currTrendUp) {
        markers.push({
          time: data[i].time,
          position: "belowBar",
          color: "#00FF00",
          shape: "arrowUp",
          text: "LONG",
          price: data[i].close,
        });
      } else {
        markers.push({
          time: data[i].time,
          position: "aboveBar",
          color: "#FF0000",
          shape: "arrowDown",
          text: "SHORT",
          price: data[i].close,
        });
      }
    }

    // Cập nhật trend
    trendUp = currTrendUp;
    prevUpper = finalUpper;
    prevLower = finalLower;
    supertrend.push(currTrendUp ? finalLower : finalUpper);
  }

  return markers;
}
