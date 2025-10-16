<template>
  <div id="chart-container" style="width: 100%; height: 100vh;"></div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { createChart } from 'lightweight-charts';
import { getStockData } from '@/DNSE_api/history';
import type { StockSSIDataResponse } from '@/DNSE_api/type';
import { setDataToChart, updateRealtimeCandle } from '@/helpers/chart'
import mqtt from 'mqtt'
import { configAccount } from '@/config/config_account';
import { config } from '@/config';

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
    timeScale: {
      timeVisible: true,
      secondsVisible: true,
      tickMarkFormatter: (timePoint: number, tickMarkType: string, locale: string) => {
        const date = new Date(timePoint * 1000);
        if (date.getHours() === 9 && date.getMinutes() === 0) {
          return date.toLocaleString('vi-VN', {
            day: '2-digit',
          });
        }

        return date.toLocaleString('vi-VN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
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
        const timePart = date.toLocaleString('vi-VN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });

        // Format date (DD/MM)
        const datePart = date.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        });

        // Combine time and date with a space
        return `${timePart}   ${datePart}`;
      },
    }

  });

  try {
    const symbol = 'VN30F1M';
    const resolution = '1';
    const endDate = new Date();
    const fromDate = new Date(endDate);
    fromDate.setDate(endDate.getDate() - 8);

    const response: StockSSIDataResponse = await getStockData(symbol, resolution, fromDate, endDate);
    setDataToChart(symbol, chart, response)


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


    client.on('connect', () => {
      console.log('✅ MQTT connected')
      config.DNSE_TOPICS.forEach(topic => {
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

        // // Nếu cùng timestamp → update nến cuối
        // if (parsed.time === lastTime) {
        //   response.data.o[lastIndex] = open
        //   response.data.h[lastIndex] = high
        //   response.data.l[lastIndex] = low
        //   response.data.c[lastIndex] = close
        //   response.data.v[lastIndex] = volume
        // } else if (parsed.time > lastTime) {
        //   // Nếu nến mới → push thêm
        //   response.data.t.push(parsed.time)
        //   response.data.o.push(parsed.open)
        //   response.data.h.push(parsed.high)
        //   response.data.l.push(parsed.low)
        //   response.data.c.push(parsed.close)
        //   response.data.v.push(parsed.volume)
        // } else return

        // Cập nhật chart & tính lại indicators
        updateRealtimeCandle(
          parsed.time,
          parsed.open,
          parsed.high,
          parsed.low,
          parsed.close,
          parsed.volume,
          symbol
        )

      } catch (err) {
        console.error('Failed to load stock data:', err);
      }
    });
  } catch (err) {
    console.error('Failed to load stock data:', err);
  }
});
</script>
