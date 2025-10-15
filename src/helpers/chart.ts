import type { CandlestickData } from "lightweight-charts";

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