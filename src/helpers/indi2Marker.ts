import type { Candle, Marker } from "./indicators";

/**
 * Gaussian Smoothed Moving Average (SGMA)
 */
function calculateSGMA(data: Candle[], period = 20): number[] {
  const sgma: number[] = [];
  const sigma = period / 2;
  const weights: number[] = [];

  // Gaussian weights
  for (let i = 0; i < period; i++) {
    const x = i - (period - 1) / 2;
    const w = Math.exp(-(x * x) / (2 * sigma * sigma));
    weights.push(w);
  }

  // Normalize weights
  const sumW = weights.reduce((a, b) => a + b, 0);
  const normW = weights.map(w => w / sumW);

  // Calculate SGMA
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sgma.push(NaN);
      continue;
    }
    let val = 0;
    for (let j = 0; j < period; j++) {
      val += data[i - j].close * normW[j];
    }
    sgma.push(val);
  }
  return sgma;
}

/**
 * Sinh Marker LONG / SHORT dựa SGMA
 */
export function indi2Marker(data: Candle[]): Marker[] {
  const period = 20;
  const sgma = calculateSGMA(data, period);
  const markers: Marker[] = [];

  for (let i = 1; i < data.length; i++) {
    if (isNaN(sgma[i]) || isNaN(sgma[i - 1])) continue;

    const prevClose = data[i - 1].close;
    const currClose = data[i].close;
    const prevSgma = sgma[i - 1];
    const currSgma = sgma[i];

    // Cắt lên → LONG
    if (prevClose < prevSgma && currClose > currSgma) {
      markers.push({
        time: data[i].time,
        position: "belowBar",
        color: "#00FF00",
        shape: "arrowUp",
        text: "LONG",
        price: currClose,
      });
    }

    // Cắt xuống → SHORT
    if (prevClose > prevSgma && currClose < currSgma) {
      markers.push({
        time: data[i].time,
        position: "aboveBar",
        color: "#FF0000",
        shape: "arrowDown",
        text: "SHORT",
        price: currClose,
      });
    }
  }

  return markers;
}
