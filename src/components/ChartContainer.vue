<template>
  <div :id="idElement" style="width: 100%; height: 90vh"></div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { createChart, createTextWatermark } from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import mqtt from 'mqtt'
import { configAccount } from '@/config/config_account';
import { config } from '@/config';
import { StockChart } from '@/helpers/stock_chart';
import { DNSESocket } from '@/DNSE_api/socket';

const props = defineProps({
  symbol: {
    type: String,
    default: 'VN30F1M'
  },
  resolution: {
    type: String,
    default: '1',
  }
});
const idElement = 'chart-container-' + props.resolution

onMounted(async () => {
  const chartContainer = document.getElementById(idElement) as HTMLDivElement;
  if (!chartContainer) return console.error('Chart container not found');

  const symbol = props.symbol;

  const stockChart = new StockChart(symbol)
  const chartConfig = stockChart.getChartConfig(chartContainer.clientWidth, chartContainer.clientHeight)
  const chart = createChart(chartContainer, chartConfig);

  try {
    const resolution = props.resolution;
    const endDate = new Date();
    const fromDate = new Date(endDate);
    fromDate.setDate(endDate.getDate() - 8);

    const response: StockSSIDataResponse = await getStockData(symbol, resolution, fromDate, endDate);
    stockChart.setData(idElement, chart, response, symbol, resolution)

    // ==============================
    // 🔌 WebSocket DNSE realtime
    // ==============================
    const socket = new DNSESocket(symbol, resolution, (msg) => {
      const { time, open, high, low, close, volume } = msg
      stockChart.updateRealtimeCandle(idElement, Number(time), Number(open), Number(high), Number(low), Number(close), Number(volume))
      if (resolution === '1') {
        document.title = `${symbol} - ${Number(close).toFixed(2)}`
      }
    })

  socket.connect()

  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});
</script>
