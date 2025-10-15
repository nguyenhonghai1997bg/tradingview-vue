import type { UTCTimestamp } from "lightweight-charts";

export const formatSeriesData = (timeArr: UTCTimestamp[], valueArr: number[]) =>
  timeArr
    .map((t, i) => ({ time: t, value: valueArr[i] }))
    .filter(p => !isNaN(p.value));

export const formatHistogramData = (timeArr: UTCTimestamp[], valueArr: number[]) =>
  timeArr
    .map((t, i) => ({
      time: t,
      value: valueArr[i],
      color: valueArr[i] >= 0 ? '#26a69a' : '#ef5350',
    }))
    .filter(p => !isNaN(p.value));