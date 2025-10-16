<template>
  <div :id="idElement" style="width: 100%; height: 90vh"></div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { createChart } from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import { StockChart } from '@/helpers/stock_chart';
import { DNSESocket } from '@/DNSE_api/socket';

const props = defineProps({
  symbol: {
    type: String,
    default: 'VN30F1M'
  },
  resolution: {
    type: Number,
    default: 1,
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
    const resolution = String(props.resolution);
    const endDate = new Date();
    const fromDate = new Date(endDate);

    // 1 phút thì chỉ cần lấy ít ngày hơn
    if (props.resolution == 1) {
      fromDate.setDate(endDate.getDate() - 8);
    } else {
      fromDate.setDate(endDate.getDate() - 30);
    }

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
