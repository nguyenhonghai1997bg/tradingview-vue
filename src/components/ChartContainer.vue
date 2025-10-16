<template>
  <div :id="idElement" style="width: 100%; height: 92vh;"></div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { createChart, type IChartApi } from 'lightweight-charts';
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

// Dùng let để giữ reference của chart instance
let chart: IChartApi | null = null;
let stockChartInstance: StockChart | null = null;
let socket: DNSESocket | null = null;

// Khai báo hàm resize
const resizeChart = () => {
    if (!chart) return;
    const chartContainer = document.getElementById(idElement) as HTMLDivElement;
    if (!chartContainer) return;
    
    // Lấy kích thước hiện tại của container
    const width = chartContainer.clientWidth;
    const height = chartContainer.clientHeight;
    
    // 💡 Gọi hàm resize của Lightweight-Charts
    chart.applyOptions({ width, height });
};


onMounted(async () => {
  const chartContainer = document.getElementById(idElement) as HTMLDivElement;
  if (!chartContainer) return console.error('Chart container not found');

  const symbol = props.symbol;

  // Khởi tạo StockChart và Chart
  stockChartInstance = new StockChart(symbol, props.resolution)
  const chartConfig = stockChartInstance.getChartConfig(chartContainer.clientWidth, chartContainer.clientHeight)
  chart = createChart(chartContainer, chartConfig);
  
  // 💡 Lắng nghe sự kiện resize của window
  window.addEventListener('resize', resizeChart);
  // Gọi resize lần đầu để đảm bảo kích thước chính xác
  resizeChart();

  try {
    const resolution = String(props.resolution);
    const endDate = new Date();
    const fromDate = new Date(endDate);

    // 1 phút thì chỉ cần lấy ít ngày hơn
    if (props.resolution === 1) {
      fromDate.setDate(endDate.getDate() - 8);
    } else {
      fromDate.setDate(endDate.getDate() - 30);
    }

    const response: StockSSIDataResponse = await getStockData(symbol, String(resolution), fromDate, endDate);
    stockChartInstance.setData(idElement, chart, response)

    // ==============================
    // WebSocket DNSE realtime
    // ==============================
    socket = new DNSESocket(symbol, resolution, (msg) => {
      const { time, open, high, low, close, volume } = msg
      // Phải kiểm tra chart null trước khi sử dụng
      if (chart && stockChartInstance) {
          stockChartInstance.updateRealtimeCandle(idElement, Number(time), Number(open), Number(high), Number(low), Number(close), Number(volume))
          if (props.resolution === 1) {
            document.title = `${Number(close).toFixed(2)} - ${symbol}`
          }
      }
    })

    socket.connect()

  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});

// Dọn dẹp khi component bị hủy
onUnmounted(() => {
  // 💡 Quan trọng: Xóa listener để tránh memory leak
  window.removeEventListener('resize', resizeChart);
  
  // Hủy kết nối socket
  socket?.disconnect(); 
  
  // Hủy biểu đồ
  chart?.remove();
});
</script>
