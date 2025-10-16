<template>
  <div :id="idElement" style="width: 100%; height: 90vh"></div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { createChart } from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import mqtt from 'mqtt'
import { configAccount } from '@/config/config_account';
import { config } from '@/config';
import { StockChart } from '@/helpers/stock_chart';

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
    stockChart.setData(idElement, chart, response)


    // ==============================
    // 🔌 WebSocket DNSE realtime
    // ==============================
    const token = localStorage.getItem(config.TOKEN_KEY)
    if (!token) {
      return
    }

    const client = mqtt.connect('wss://datafeed-lts-krx.dnse.com.vn:443/wss', {
      clientId: `dnse-price-json-mqtt-ws-sub-${configAccount.investorId}-${Math.random().toString(16).substr(2, 8)}`,
      username: configAccount.investorId,
      password: token,
      protocol: 'wss',        // WebSocket Secure
      clean: true,
      reconnectPeriod: 3000,  // reconnect every 3s
      connectTimeout: 5000,
      rejectUnauthorized: false,
    })

    client.on('error', (err) => {
      console.error('❌ MQTT error:', err.message);
    });

    client.on('close', () => {
      console.warn('⚠️ MQTT connection closed');
    });

    client.on('reconnect', () => {
      console.log('🔁 Reconnecting...');
    });

    const DNSE_TOPICS = [
      `plaintext/quotes/krx/mdds/v2/ohlc/derivative/${resolution}/${symbol}`,
      `plaintext/quotes/krx/mdds/tick/v1/roundlot/${symbol}`
    ]

    client.on('connect', () => {
      console.log('✅ MQTT connected')
      DNSE_TOPICS.forEach(topic => {
        client.subscribe(topic, { qos: 2 });
      });
    })


    client.on('message', (topic: any, message: any) => {
      try {
        const msg = JSON.parse(message.toString())

        if (!msg || !msg.symbol || !msg.time) return
        if (msg.symbol !== symbol) return

        const { time, open, high, low, close, volume } = msg;
        const parsed = {
          time: Number(time),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume)
        };

        const lastIndex = response.data.t.length - 1
        const lastTime = response.data.t[lastIndex]
        if (!lastTime) return

        // Cập nhật chart & tính lại indicators
        stockChart.updateRealtimeCandle(
          idElement,
          parsed.time,
          parsed.open,
          parsed.high,
          parsed.low,
          parsed.close,
          parsed.volume,
        )

        if (resolution == '1') {
          document.title = `${symbol} - ${parsed.close.toFixed(2)}`;
        }

      } catch (err) {
        console.error('Failed to load stock data:', err);
      }
    });
  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});
</script>
