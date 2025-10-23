import type { CandlestickData } from "lightweight-charts";
import { indi1Marker } from "./indi1";
import { indi2Marker } from "./indi2Marker";
import { indi3Marker } from "./indi3Marker";

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
  const markers: Marker[] = [];

  // markers.push(...indi1Marker(data))

  markers.push(...indi2Marker(data))
  // markers.push(...indi3Marker(data))


  // Sắp xếp & lọc trùng theo time
  const unique = new Map<number, Marker>();
  for (const m of markers) {
    if (!unique.has(m.time)) unique.set(m.time, m);
  }

  return Array.from(unique.values()).sort((a, b) => a.time - b.time);
};
