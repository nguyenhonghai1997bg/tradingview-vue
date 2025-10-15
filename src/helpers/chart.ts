import type { StockSSIDataResponse } from "@/DNSE_api/type";
import { CandlestickSeries, createSeriesMarkers, HistogramSeries, LineSeries, type CandlestickData, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { generateSignals } from "@/helpers/indicators";
import { formatHistogramData, formatSeriesData } from "./data";
import { calculateEMA, calculateKDJ, calculateMACD, calculateRSI, calculateSMA, calculateStochRSI, calculateStochRSI_KD } from "@/helpers/tradingview_indicator";

export const attachPaneLegends = () => {
  const container = document.querySelector('.tv-lightweight-charts');
  if (!container) return;

  const rows = container.querySelectorAll('table tr');
  if (!rows.length) return;

  const mapping = [
    { trIndex: 0, id: 'pane-0-legend' },
    { trIndex: 2, id: 'pane-1-legend' },
    { trIndex: 4, id: 'pane-2-legend' },
    { trIndex: 6, id: 'pane-3-legend' },
  ];

  mapping.forEach(({ trIndex, id }) => {
    const tr = rows[trIndex] as HTMLTableRowElement;
    if (!tr) return;

    // Tạo phần tử legend nếu chưa tồn tại
    let legend = document.getElementById(id) as HTMLDivElement;
    if (!legend) {
      tr.style.position = 'relative';
      legend = document.createElement('div');
      legend.id = id;
      legend.className = 'legend';
      tr.appendChild(legend);
    }

    // Cập nhật vị trí của legend
    const rect = tr.getBoundingClientRect();
    legend.style.position = 'absolute';
    legend.style.top = '0';
    legend.style.left = '10px';
    legend.style.zIndex = '10';
  });
};


export const updateLegends = (
  symbol: string,
  candlestick: CandlestickData | undefined,
  volume: number | undefined,
  sma60: number | undefined,
  ema15: number | undefined,
  k: number | undefined,
  d: number | undefined,
  j: number | undefined,
  macdVal: number | undefined,
  signalVal: number | undefined,
  histogramVal: number | undefined,
  rsiKVal: number | undefined,
  rsiDVal: number | undefined
) => {
  const pane0Legend = document.getElementById('pane-0-legend') as HTMLDivElement;
  const pane1Legend = document.getElementById('pane-1-legend') as HTMLDivElement;
  const pane2Legend = document.getElementById('pane-2-legend') as HTMLDivElement;
  const pane3Legend = document.getElementById('pane-3-legend') as HTMLDivElement;

  if (pane0Legend) {
    pane0Legend.innerHTML = `
      <div>
        <span>${symbol}</span>
        <p style="color: #26a69a;"> ■ O=${formatValue(candlestick?.open)}, H=${formatValue(candlestick?.high)}, L=${formatValue(candlestick?.low)}, C=${formatValue(candlestick?.close)}</p>
        <p style="color: white;">
          <span>■ SMA60: ${formatValue(sma60)}</span>
          <span style="color: #FFA500;">■ EMA15: ${formatValue(ema15)}</span>
        </p>
        <p>■ Volume: ${formatValue(volume, 0)}</p>
      </div>
    `;
  }
  if (pane1Legend) {
    pane1Legend.innerHTML = `
      <div style="display: flex; gap: 10px;">
        <span>KDJ</span>
        <span style="color: #FF69B4;">■ J: ${formatValue(j)}</span>
        <span style="color: #00FF00;">■ K: ${formatValue(k)}</span>
        <span style="color: #FFFF00;">■ D: ${formatValue(d)}</span>
      </div>
    `;
  }
  if (pane2Legend) {
    pane2Legend.innerHTML = `
      <div style="display: flex; gap: 10px;">
        <span>MACD</span>
        <span style="color: #0000FF;">■ MACD: ${formatValue(macdVal)}</span>
        <span style="color: #FFA500;">■ Signal: ${formatValue(signalVal)}</span>
        <span style="color: #26a69a;">■ Histogram: ${formatValue(histogramVal)}</span>
      </div>
    `;
  }
  if (pane3Legend) {
    pane3Legend.innerHTML = `
      <div style="display: flex; gap: 10px;">
        <span>StochRSI </span>
        <span style="color: #1E90FF;">■ K: ${formatValue(rsiKVal)}</span>
        <span style="color: red;">■ D: ${formatValue(rsiDVal)}</span>
      </div>
    `;
  }
};

const formatValue = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null) return '-';
  return value.toFixed(decimals);
};


export const setDataToChart = (symbol: string, chart: IChartApi, response: StockSSIDataResponse) => {
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


    setTimeout(() => {
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

      // Usage in your component
      const markers = generateSignals(candlestickData);
      createSeriesMarkers(candlestickSeries, markers);

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

    }, 100)

    
  setTimeout(() => {
    attachPaneLegends();
  }, 100)

  chart.timeScale().fitContent();
}