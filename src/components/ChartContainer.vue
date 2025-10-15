<template>
  <div id="chart-container" style="width: 100%; height: 100vh;"></div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import { setDataToChart } from '@/helpers/chart'

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
    crosshair: { mode: 0 },
  });

  try {
    const symbol = 'VN30F1M';
    const resolution = '1';
    const endDate = new Date();
    const fromDate = new Date(endDate);
    fromDate.setDate(endDate.getDate() - 8);

    const response: StockSSIDataResponse = await getStockData(symbol, resolution, fromDate, endDate);
    setDataToChart(symbol, chart, response)

  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});
</script>
