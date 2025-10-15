<template>
  <div id="chart-container" style="width: 100%; height: 100vh;"></div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type CandlestickData,
  type UTCTimestamp,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateKDJ, calculateStochRSI_KD, calculateStochRSI } from '@/helpers/indicators';
import { formatHistogramData, formatSeriesData } from '@/helpers/data';

onMounted(async () => {
  const chartContainer = document.getElementById('chart-container') as HTMLDivElement;
  if (!chartContainer) return console.error('Chart container not found');

  const chart = createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
      background: { color: '#171B26' },
      textColor: '#FFFFFF',
      panes: { enableResize: true, separatorHoverColor: 'rgba(255, 0, 0, 0.1)' },
    },
    grid: { vertLines: { color: '#222631' }, horzLines: { color: '#222631' } },
    timeScale: { timeVisible: true, secondsVisible: true },
    rightPriceScale: { scaleMargins: { top: 0.3, bottom: 0.1 } },
    leftPriceScale: { scaleMargins: { top: 0.3, bottom: 0.1 } },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
  });

  const candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350'
  });


  const volumeSeries = chart.addSeries(HistogramSeries, {
    color: '#26a69a',
    priceFormat: {
        type: 'volume',
    },
    priceScaleId: '',
  });
  volumeSeries.priceScale().applyOptions({
      scaleMargins: {
          top: 0.7, // highest point of the series will be 70% away from the top
          bottom: 0,
      },
  });



  // MACD setup
  const macdSeries = chart.addSeries(LineSeries, { color: '#0000FF', lineWidth: 1, priceLineVisible: false  });
  const signalSeries = chart.addSeries(LineSeries, { color: '#FFA500', lineWidth: 1, priceLineVisible: false  });
  const histogramSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
  });

  // KDJ setup
  const kSeries = chart.addSeries(LineSeries, { color: '#00FF00', lineWidth: 1, priceLineVisible: false });
  const dSeries = chart.addSeries(LineSeries, { color: '#FFFF00', lineWidth: 1, priceLineVisible: false  });
  const jSeries = chart.addSeries(LineSeries, { color: '#FF69B4', lineWidth: 1, priceLineVisible: false  });

  const rsiSeriesK = chart.addSeries(LineSeries, { color: '#1E90FF', lineWidth: 1, priceLineVisible: false });
  const rsiSeriesD = chart.addSeries(LineSeries, { color: 'red', lineWidth: 1, priceLineVisible: false });

  const sma60Series = chart.addSeries(LineSeries, { color: 'white', lineWidth: 1, priceLineVisible: false });
  const ema15Series = chart.addSeries(LineSeries, { color: '#FFA500', lineWidth: 1, priceLineVisible: false });

  candlestickSeries.moveToPane(0);
  kSeries.moveToPane(1);
  dSeries.moveToPane(1);
  jSeries.moveToPane(1);
  macdSeries.moveToPane(2);
  signalSeries.moveToPane(2);
  histogramSeries.moveToPane(2);
  rsiSeriesK.moveToPane(3);
  rsiSeriesD.moveToPane(3);

  try {
    const symbol = 'VN30F1M';
    const resolution = '1';
    const endDate = new Date();
    const fromDate = new Date(endDate);
    fromDate.setDate(endDate.getDate() - 2);

    const response: StockSSIDataResponse = await getStockData(symbol, resolution, fromDate, endDate);

    // Dữ liệu nến
    const seenTimes = new Set<number>();
    const uniqueData = response.data.t.map((t, i) => ({
      t,
      o: response.data.o[i] || 0,
      h: response.data.h[i] || 0,
      l: response.data.l[i] || 0,
      c: response.data.c[i] || 0,
      v: response.data.v[i] || 0,
    })).filter(item => !seenTimes.has(item.t) && seenTimes.add(item.t));
    uniqueData.sort((a, b) => a.t - b.t);

    const candlestickData: CandlestickData[] = uniqueData.map(i => ({
      time: i.t as UTCTimestamp,
      open: i.o,
      high: i.h,
      low: i.l,
      close: i.c
    }));

    const times = uniqueData.map(i => i.t as UTCTimestamp);
    const close = uniqueData.map(i => i.c);
    const high = uniqueData.map(i => i.h);
    const low = uniqueData.map(i => i.l);

    // ====== TÍNH CHỈ BÁO ======
    const { macd, signal, histogram } = calculateMACD(close);
    const { k, d, j } = calculateKDJ(high, low, close);

    const rsi = calculateRSI(close, 14)
    const stochRSI = calculateStochRSI(rsi, 14)
    const { rsiK, rsiD } = calculateStochRSI_KD(stochRSI, 3, 3)

    const sma60Value = calculateSMA(close, 60)
    const ema15Value = calculateEMA(close, 15)

    // ====== GÁN DỮ LIỆU ======
    candlestickSeries.setData(candlestickData);

    macdSeries.setData(formatSeriesData(times, macd));
    signalSeries.setData(formatSeriesData(times, signal));
    histogramSeries.setData(formatHistogramData(times, histogram));

    kSeries.setData(formatSeriesData(times, k));
    dSeries.setData(formatSeriesData(times, d));
    jSeries.setData(formatSeriesData(times, j));

    // Tính RSI 14
    rsiSeriesK.setData(formatSeriesData(times, rsiK));
    rsiSeriesD.setData(formatSeriesData(times, rsiD));


    sma60Series.setData(formatSeriesData(times, sma60Value))
    ema15Series.setData(formatSeriesData(times, ema15Value))

    volumeSeries.setData(uniqueData.map(i => ({
      time: i.t as UTCTimestamp,
      value: i.v,
      color: i.c >= i.o ? '#26a69a' : '#ef5350', // xanh nếu tăng, đỏ nếu giảm
    })));

    // ====== CĂN CHART ======
    chart.timeScale().fitContent();

    onUnmounted(() => {
      chart.remove();
    });
  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});
</script>

<style scoped>
#chart-container {
  width: 100%;
  height: 600px;
}
</style>
