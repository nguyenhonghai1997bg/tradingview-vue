import type { StockSSIDataResponse } from "@/DNSE_api/type";
import {
  CandlestickSeries,
  createSeriesMarkers,
  createTextWatermark,
  HistogramSeries,
  LineSeries,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { generateSignals } from "@/helpers/indicators";
import { formatHistogramData, formatSeriesData } from "@/helpers/data";
import {
  calculateEMA,
  calculateKDJ,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateStochRSI,
  calculateStochRSI_KD,
} from "@/helpers/tradingview_indicator";

export class StockChart {
  private symbol: string;
  private candlestickSeries: ISeriesApi<"Candlestick">;
  private volumeSeries: ISeriesApi<"Histogram">;
  private macdSeries: ISeriesApi<"Line">;
  private signalSeries: ISeriesApi<"Line">;
  private histogramSeries: ISeriesApi<"Histogram">;
  private kSeries: ISeriesApi<"Line">;
  private dSeries: ISeriesApi<"Line">;
  private jSeries: ISeriesApi<"Line">;
  private rsiSeriesK: ISeriesApi<"Line">;
  private rsiSeriesD: ISeriesApi<"Line">;
  private sma60Series: ISeriesApi<"Line">;
  private ema15Series: ISeriesApi<"Line">;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  public getChartConfig(width: number, height: number) {
    return {
      width,
      height,
      layout: {
        background: { color: "#171B26" },
        textColor: "#FFFFFF",
        panes: { enableResize: true, separatorHoverColor: "rgba(255, 0, 0, 0.1)" },
      },
      grid: { vertLines: { color: "#222631" }, horzLines: { color: "#222631" } },
      timeScale: {
        rightOffset: 20,
        barSpacing: 8,
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (timePoint: number) => {
          const date = new Date(timePoint * 1000);
          if (date.getHours() === 9 && date.getMinutes() === 0) {
            return date.toLocaleString("vi-VN", { day: "2-digit" });
          }
          return date.toLocaleString("vi-VN", { hour12: false, hour: "2-digit", minute: "2-digit" });
        },
      },
      rightPriceScale: { scaleMargins: { top: 0.3, bottom: 0.1 } },
      leftPriceScale: { scaleMargins: { top: 0.3, bottom: 0.1 } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      crosshair: { mode: 0 },
      localization: {
        timeFormatter: (businessDayOrTimestamp: number) => {
          const date = new Date(businessDayOrTimestamp * 1000);
          const timePart = date.toLocaleString("vi-VN", { hour12: false, hour: "2-digit", minute: "2-digit" });
          const datePart = date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit" });
          return `${datePart}   ${timePart}`;
        },
      },
    };
  }

  public setData(
    idElement: string,
    chart: IChartApi,
    response: StockSSIDataResponse,
    symbol: string,
    resolution: string
  ): void {
    this.initializeSeries(chart, symbol, resolution);

    setTimeout(() => {
      const seenTimes = new Set<number>();
      const uniqueData = response.data.t
        .map((t, i) => ({
          t,
          o: response.data.o[i] || 0,
          h: response.data.h[i] || 0,
          l: response.data.l[i] || 0,
          c: response.data.c[i] || 0,
          v: response.data.v[i] || 0,
        }))
        .filter((item) => !seenTimes.has(item.t) && seenTimes.add(item.t));

      uniqueData.sort((a, b) => a.t - b.t);

      const candlestickData: CandlestickData[] = uniqueData.map((i) => ({
        time: i.t as UTCTimestamp,
        open: i.o,
        high: i.h,
        low: i.l,
        close: i.c,
      }));

      const times = uniqueData.map((i) => i.t as UTCTimestamp);
      const close = uniqueData.map((i) => i.c);
      const high = uniqueData.map((i) => i.h);
      const low = uniqueData.map((i) => i.l);

      const markers = generateSignals(candlestickData);
      if (this.candlestickSeries) {
        createSeriesMarkers(this.candlestickSeries, markers)
      }

      const { macd, signal, histogram } = calculateMACD(close);
      const { k, d, j } = calculateKDJ(high, low, close);
      const rsi = calculateRSI(close, 14);
      const stochRSI = calculateStochRSI(rsi, 14);
      const { rsiK, rsiD } = calculateStochRSI_KD(stochRSI, 3, 3);
      const sma60Value = calculateSMA(close, 60);
      const ema15Value = calculateEMA(close, 15);

      this.candlestickSeries?.setData(candlestickData);
      this.macdSeries?.setData(formatSeriesData(times, macd));
      this.signalSeries?.setData(formatSeriesData(times, signal));
      this.histogramSeries?.setData(formatHistogramData(times, histogram));
      this.kSeries?.setData(formatSeriesData(times, k));
      this.dSeries?.setData(formatSeriesData(times, d));
      this.jSeries?.setData(formatSeriesData(times, j));
      this.rsiSeriesK?.setData(formatSeriesData(times, rsiK));
      this.rsiSeriesD?.setData(formatSeriesData(times, rsiD));
      this.sma60Series?.setData(formatSeriesData(times, sma60Value));
      this.ema15Series?.setData(formatSeriesData(times, ema15Value));
      this.volumeSeries?.setData(
        uniqueData.map((i) => ({
          time: i.t as UTCTimestamp,
          value: i.v,
          color: i.c >= i.o ? "#26a69a" : "#ef5350",
        }))
      );

      const panes = chart.panes();
      panes[0]?.setHeight(400);

      const latestCandlestick = candlestickData[candlestickData.length - 1];
      const volumeData = this.volumeSeries?.data();
      const latestVolume = volumeData?.length ? volumeData[volumeData.length - 1]?.value : undefined;
      const latestSma60 = sma60Value.length ? sma60Value[sma60Value.length - 1] : undefined;
      const latestEma15 = ema15Value.length ? ema15Value[ema15Value.length - 1] : undefined;
      const latestK = k.length ? k[k.length - 1] : undefined;
      const latestD = d.length ? d[d.length - 1] : undefined;
      const latestJ = j.length ? j[j.length - 1] : undefined;
      const latestMacd = macd.length ? macd[macd.length - 1] : undefined;
      const latestSignal = signal.length ? signal[signal.length - 1] : undefined;
      const latestHistogram = histogram.length ? histogram[histogram.length - 1] : undefined;
      const latestRsiK = rsiK.length ? rsiK[rsiK.length - 1] : undefined;
      const latestRsiD = rsiD.length ? rsiD[rsiD.length - 1] : undefined;

      this.updateLegends(
        idElement,
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

      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.seriesData) {
          this.updateLegends(
            idElement,
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

        const candlestick = param.seriesData.get(this.candlestickSeries!) as CandlestickData;
        const volume = param.seriesData.get(this.volumeSeries!)?.value;
        const sma60 = param.seriesData.get(this.sma60Series!)?.value;
        const ema15 = param.seriesData.get(this.ema15Series!)?.value;
        const k = param.seriesData.get(this.kSeries!)?.value;
        const d = param.seriesData.get(this.dSeries!)?.value;
        const j = param.seriesData.get(this.jSeries!)?.value;
        const macdVal = param.seriesData.get(this.macdSeries!)?.value;
        const signalVal = param.seriesData.get(this.signalSeries!)?.value;
        const histogramVal = param.seriesData.get(this.histogramSeries!)?.value;
        const rsiKVal = param.seriesData.get(this.rsiSeriesK!)?.value;
        const rsiDVal = param.seriesData.get(this.rsiSeriesD!)?.value;

        this.updateLegends(idElement, candlestick, volume, sma60, ema15, k, d, j, macdVal, signalVal, histogramVal, rsiKVal, rsiDVal);
      });

      // chart.timeScale().fitContent();
    }, 100);

    setTimeout(() => {
      this.attachPaneLegends(idElement);
    }, 100);
  }

  public updateRealtimeCandle(idElement: string, time: number, open: number, high: number, low: number, close: number, volume: number): void {
    if (!this.candlestickSeries || !this.volumeSeries) {
      console.error("Candlestick or Volume series not initialized.");
      return;
    }

    const newCandleData: CandlestickData<UTCTimestamp> = {
      time: time as UTCTimestamp,
      open,
      high,
      low,
      close,
    };
    this.candlestickSeries.update(newCandleData);

    this.volumeSeries.update({
      time: time as UTCTimestamp,
      value: volume,
      color: close >= open ? "#26a69a" : "#ef5350",
    });

    this.updateIndicators(idElement);
  }

  private updateIndicators(idElement: string): void {
    if (
      !this.candlestickSeries ||
      !this.macdSeries ||
      !this.signalSeries ||
      !this.histogramSeries ||
      !this.kSeries ||
      !this.dSeries ||
      !this.jSeries ||
      !this.rsiSeriesK ||
      !this.rsiSeriesD ||
      !this.sma60Series ||
      !this.ema15Series ||
      !this.volumeSeries
    ) {
      console.error("Series not initialized. Cannot update indicators.");
      return;
    }

    const candlestickData = this.candlestickSeries.data() as CandlestickData<UTCTimestamp>[];
    if (!candlestickData.length) {
      console.warn("No candlestick data available to calculate indicators.");
      return;
    }

    const closeValues = candlestickData.map((d) => d.close);
    const highValues = candlestickData.map((d) => d.high);
    const lowValues = candlestickData.map((d) => d.low);
    const times = candlestickData.map((d) => d.time);

    const { macd, signal, histogram } = calculateMACD(closeValues);
    const { k, d, j } = calculateKDJ(highValues, lowValues, closeValues);
    const rsi = calculateRSI(closeValues, 14);
    const stochRSI = calculateStochRSI(rsi, 14);
    const { rsiK, rsiD } = calculateStochRSI_KD(stochRSI, 3, 3);
    const sma60Value = calculateSMA(closeValues, 60);
    const ema15Value = calculateEMA(closeValues, 15);

    this.macdSeries.setData(formatSeriesData(times, macd));
    this.signalSeries.setData(formatSeriesData(times, signal));
    this.histogramSeries.setData(formatHistogramData(times, histogram));
    this.kSeries.setData(formatSeriesData(times, k));
    this.dSeries.setData(formatSeriesData(times, d));
    this.jSeries.setData(formatSeriesData(times, j));
    this.rsiSeriesK.setData(formatSeriesData(times, rsiK));
    this.rsiSeriesD.setData(formatSeriesData(times, rsiD));
    this.sma60Series.setData(formatSeriesData(times, sma60Value));
    this.ema15Series.setData(formatSeriesData(times, ema15Value));

    const latestCandlestick = candlestickData[candlestickData.length - 1];
    const volumeData = this.volumeSeries.data();
    const latestVolume = volumeData.length ? volumeData[volumeData.length - 1]?.value : undefined;
    const latestSma60 = sma60Value.length ? sma60Value[sma60Value.length - 1] : undefined;
    const latestEma15 = ema15Value.length ? ema15Value[ema15Value.length - 1] : undefined;
    const latestK = k.length ? k[k.length - 1] : undefined;
    const latestD = d.length ? d[d.length - 1] : undefined;
    const latestJ = j.length ? j[j.length - 1] : undefined;
    const latestMacd = macd.length ? macd[macd.length - 1] : undefined;
    const latestSignal = signal.length ? signal[signal.length - 1] : undefined;
    const latestHistogram = histogram.length ? histogram[histogram.length - 1] : undefined;
    const latestRsiK = rsiK.length ? rsiK[rsiK.length - 1] : undefined;
    const latestRsiD = rsiD.length ? rsiD[rsiD.length - 1] : undefined;

    this.updateLegends(
      idElement,
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

    const markers = generateSignals(candlestickData);
    if (this.candlestickSeries) {
      createSeriesMarkers(this.candlestickSeries, markers)
    }
  }

  private initializeSeries(chart: IChartApi, symbol: string, resolution: string): void {
    const firstPane = chart.panes()[0];
    if (firstPane) {
      createTextWatermark(firstPane, {
        horzAlign: 'right',
        vertAlign: 'top',
        lines: [
          {
            text: `${symbol} - ${resolution}p`,
            color: 'white',
            fontSize: 24,
          },
        ],
      });
    }

    this.candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    this.volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "",
      priceLineVisible: false,
    });
    this.volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    this.macdSeries = chart.addSeries(LineSeries, {
      color: "#0000FF",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    this.signalSeries = chart.addSeries(LineSeries, {
      color: "#FFA500",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    this.histogramSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceLineVisible: false,
    });

    this.kSeries = chart.addSeries(LineSeries, {
      color: "#00FF00",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    this.dSeries = chart.addSeries(LineSeries, {
      color: "#FFFF00",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    this.jSeries = chart.addSeries(LineSeries, {
      color: "#FF69B4",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    this.rsiSeriesK = chart.addSeries(LineSeries, {
      color: "#1E90FF",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    this.rsiSeriesD = chart.addSeries(LineSeries, {
      color: "red",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    this.sma60Series = chart.addSeries(LineSeries, {
      color: "white",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    this.ema15Series = chart.addSeries(LineSeries, {
      color: "#FFA500",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    this.candlestickSeries.moveToPane(0);
    this.volumeSeries.moveToPane(0);
    this.kSeries.moveToPane(1);
    this.dSeries.moveToPane(1);
    this.jSeries.moveToPane(1);
    this.macdSeries.moveToPane(2);
    this.signalSeries.moveToPane(2);
    this.histogramSeries.moveToPane(2);
    this.rsiSeriesK.moveToPane(3);
    this.rsiSeriesD.moveToPane(3);
  }

  private attachPaneLegends(idElement: string): void {
    const container = document.querySelector(`#${idElement} .tv-lightweight-charts`);
    if (!container) return;

    const rows = container.querySelectorAll("table tr");
    if (!rows.length) return;

    const mapping = [
      { trIndex: 0, id: "pane-0-legend" },
      { trIndex: 2, id: "pane-1-legend" },
      { trIndex: 4, id: "pane-2-legend" },
      { trIndex: 6, id: "pane-3-legend" },
    ];

    mapping.forEach(({ trIndex, id }) => {
      const tr = rows[trIndex] as HTMLTableRowElement;
      if (!tr) return;

      let legend = container.querySelectorAll(id)[0] as HTMLDivElement;
      if (!legend) {
        tr.style.position = "relative";
        legend = document.createElement("div");
        legend.id = id;
        legend.className = "legend";
        tr.appendChild(legend);
      }

      legend.style.position = "absolute";
      legend.style.top = "0";
      legend.style.left = "10px";
      legend.style.zIndex = "10";
    });
  }

  private formatValue(value: number | undefined | null, decimals: number = 2): string {
    if (value === undefined || value === null) return "-";
    return value.toFixed(decimals);
  }

  private updateLegends(
    idElement: string,
    candlestick?: CandlestickData,
    volume?: number,
    sma60?: number,
    ema15?: number,
    k?: number,
    d?: number,
    j?: number,
    macdVal?: number,
    signalVal?: number,
    histogramVal?: number,
    rsiKVal?: number,
    rsiDVal?: number
  ): void {
    const container = document.querySelector(`#${idElement} .tv-lightweight-charts`);
    if (!container) return;

    const pane0Legend = container.querySelectorAll("#pane-0-legend")[0];
    const pane1Legend = container.querySelectorAll("#pane-1-legend")[0];
    const pane2Legend = container.querySelectorAll("#pane-2-legend")[0];
    const pane3Legend = container.querySelectorAll("#pane-3-legend")[0];

    if (pane0Legend) {
      pane0Legend.innerHTML = `
        <div class="value-data">
          <span>${this.symbol}</span><br>
          <span style="color: #26a69a;" class="px-0 mx-0"> ■ O=${this.formatValue(candlestick?.open)}, H=${this.formatValue(
        candlestick?.high
      )}, L=${this.formatValue(candlestick?.low)}, C=${this.formatValue(candlestick?.close)}</span><br>
          <span style="color: white;" class="px-0 mx-0">
            <span>■ SMA60: ${this.formatValue(sma60)}</span>
            <span style="color: #FFA500;">■ EMA15: ${this.formatValue(ema15)}</span>
          </span><br>
          <span class="px-0 mx-0">■ Volume: ${this.formatValue(volume, 0)}</span>
        </div>
      `;
    }
    if (pane1Legend) {
      pane1Legend.innerHTML = `
        <div style="display: flex; gap: 10px;" class="value-data">
          <span>KDJ</span>
          <span style="color: #FF69B4;">■ J: ${this.formatValue(j)}</span>
          <span style="color: #00FF00;">■ K: ${this.formatValue(k)}</span>
          <span style="color: #FFFF00;">■ D: ${this.formatValue(d)}</span>
        </div>
      `;
    }
    if (pane2Legend) {
      pane2Legend.innerHTML = `
        <div style="display: flex; gap: 10px;" class="value-data">
          <span>MACD</span>
          <span style="color: #0000FF;">■ MACD: ${this.formatValue(macdVal)}</span>
          <span style="color: #FFA500;">■ Signal: ${this.formatValue(signalVal)}</span>
          <span style="color: #26a69a;">■ Histogram: ${this.formatValue(histogramVal)}</span>
        </div>
      `;
    }
    if (pane3Legend) {
      pane3Legend.innerHTML = `
        <div style="display: flex; gap: 10px;" class="value-data">
          <span>StochRSI </span>
          <span style="color: #1E90FF;">■ K: ${this.formatValue(rsiKVal)}</span>
          <span style="color: red;">■ D: ${this.formatValue(rsiDVal)}</span>
        </div>
      `;
    }
  }
}
