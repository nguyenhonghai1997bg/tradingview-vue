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
} from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateKDJ, calculateStochRSI_KD, calculateStochRSI } from '@/helpers/indicators';
import { formatHistogramData, formatSeriesData } from '@/helpers/data';
import { attachPaneLegends, updateLegends } from '@/helpers/chart'

// Phần còn lại của mã (khởi tạo chart, series, xử lý dữ liệu, v.v.) giữ nguyên
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
    crosshair: { mode: CrosshairMode.Magnet },
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
    priceFormat: { type: 'volume' },
    priceScaleId: '',
  });
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.8, bottom: 0 },
  });

  const macdSeries = chart.addSeries(LineSeries, { color: '#0000FF', lineWidth: 1, priceLineVisible: false });
  const signalSeries = chart.addSeries(LineSeries, { color: '#FFA500', lineWidth: 1, priceLineVisible: false });
  const histogramSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
  });

  const kSeries = chart.addSeries(LineSeries, { color: '#00FF00', lineWidth: 1, priceLineVisible: false });
  const dSeries = chart.addSeries(LineSeries, { color: '#FFFF00', lineWidth: 1, priceLineVisible: false });
  const jSeries = chart.addSeries(LineSeries, { color: '#FF69B4', lineWidth: 1, priceLineVisible: false });

  const rsiSeriesK = chart.addSeries(LineSeries, { color: '#1E90FF', lineWidth: 1, priceLineVisible: false });
  const rsiSeriesD = chart.addSeries(LineSeries, { color: 'red', lineWidth: 1, priceLineVisible: false });

  const sma60Series = chart.addSeries(LineSeries, { color: 'white', lineWidth: 1, priceLineVisible: false });
  const ema15Series = chart.addSeries(LineSeries, { color: '#FFA500', lineWidth: 1, priceLineVisible: false });

  candlestickSeries.moveToPane(0);
  volumeSeries.moveToPane(0);

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

    const { macd, signal, histogram } = calculateMACD(close);
    const { k, d, j } = calculateKDJ(high, low, close);
    const rsi = calculateRSI(close, 14);
    const stochRSI = calculateStochRSI(rsi, 14);
    const { rsiK, rsiD } = calculateStochRSI_KD(stochRSI, 3, 3);
    const sma60Value = calculateSMA(close, 60);
    const ema15Value = calculateEMA(close, 15);

    candlestickSeries.setData(candlestickData);
    const macdData = formatSeriesData(times, macd);
    const signalData = formatSeriesData(times, signal);
    const histogramData = formatHistogramData(times, histogram);
    const kData = formatSeriesData(times, k);
    const dData = formatSeriesData(times, d);
    const jData = formatSeriesData(times, j);
    const rsiKData = formatSeriesData(times, rsiK);
    const rsiDData = formatSeriesData(times, rsiD);
    const sma60Data = formatSeriesData(times, sma60Value);
    const ema15Data = formatSeriesData(times, ema15Value);
    const volumeData = uniqueData.map(i => ({
      time: i.t as UTCTimestamp,
      value: i.v,
      color: i.c >= i.o ? '#26a69a' : '#ef5350',
    }));

    macdSeries.setData(macdData);
    signalSeries.setData(signalData);
    histogramSeries.setData(histogramData);
    kSeries.setData(kData);
    dSeries.setData(dData);
    jSeries.setData(jData);
    rsiSeriesK.setData(rsiKData);
    rsiSeriesD.setData(rsiDData);
    sma60Series.setData(sma60Data);
    ema15Series.setData(ema15Data);
    volumeSeries.setData(volumeData);


    const panes = chart.panes();
    panes[0]?.setHeight(450);



    // Display most recent values by default
    const latestCandlestick = candlestickData[candlestickData.length - 1];
    const latestVolume = volumeData[volumeData.length - 1]?.value;
    const latestSma60 = sma60Data[sma60Data.length - 1]?.value;
    const latestEma15 = ema15Data[ema15Data.length - 1]?.value;
    const latestK = kData[kData.length - 1]?.value;
    const latestD = dData[dData.length - 1]?.value;
    const latestJ = jData[jData.length - 1]?.value;
    const latestMacd = macdData[macdData.length - 1]?.value;
    const latestSignal = signalData[signalData.length - 1]?.value;
    const latestHistogram = histogramData[histogramData.length - 1]?.value;
    const latestRsiK = rsiKData[rsiKData.length - 1]?.value;
    const latestRsiD = rsiDData[rsiDData.length - 1]?.value;

    updateLegends(
      symbol,
      latestCandlestick,
      latestVolume,
      latestSma60,
      latestEma15,
      latestK,
      latestD,
      latestJ,
      latestMacd,
      latestSignal,
      latestHistogram,
      latestRsiK,
      latestRsiD
    );

    // Subscribe to crosshair movement to update legend values
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        // Show most recent values when crosshair is not active
        updateLegends(
          symbol,
          latestCandlestick,
          latestVolume,
          latestSma60,
          latestEma15,
          latestK,
          latestD,
          latestJ,
          latestMacd,
          latestSignal,
          latestHistogram,
          latestRsiK,
          latestRsiD
        );
        return;
      }

      // Get series data at the hovered time
      const candlestick = param.seriesData.get(candlestickSeries) as CandlestickData;
      const volume = param.seriesData.get(volumeSeries)?.value;
      const sma60 = param.seriesData.get(sma60Series)?.value;
      const ema15 = param.seriesData.get(ema15Series)?.value;
      const k = param.seriesData.get(kSeries)?.value;
      const d = param.seriesData.get(dSeries)?.value;
      const j = param.seriesData.get(jSeries)?.value;
      const macdVal = param.seriesData.get(macdSeries)?.value;
      const signalVal = param.seriesData.get(signalSeries)?.value;
      const histogramVal = param.seriesData.get(histogramSeries)?.value;
      const rsiKVal = param.seriesData.get(rsiSeriesK)?.value;
      const rsiDVal = param.seriesData.get(rsiSeriesD)?.value;

      // Update legends with hovered values
      updateLegends(
        symbol,
        candlestick,
        volume,
        sma60,
        ema15,
        k,
        d,
        j,
        macdVal,
        signalVal,
        histogramVal,
        rsiKVal,
        rsiDVal
      );
    });

    attachPaneLegends();

    chart.timeScale().fitContent();

    // const tradingivewIcon = document.getElementById('tv-attr-logo') as HTMLDivElement;
    // if(tradingivewIcon) {{
    //   tradingivewIcon.style.display = 'none'
    // }}
    onUnmounted(() => {
      chart.remove();
    });
  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});
</script>
