<template>
  <div style="max-width: 100%; overflow-x: hidden;">
    <div class="row mt-2">
      <!-- Chart 1 phút -->
      <div class="col-md-6">
        <h6 class="text-center">{{ symbol }} ({{ resolutions[0] }} phút)</h6>
        <ChartContainer
          :symbol="symbol"
          :resolution="resolutions[0]"
          :key="'chart1'"
          class="chart1"
          @price-update="updatePrice"
        />
      </div>

      <!-- Chart 5 phút -->
      <div class="col-md-6">
        <h6 class="text-center">{{ symbol }} ({{ resolutions[1] }} phút)</h6>
        <ChartContainer
          :symbol="symbol"
          :resolution="resolutions[1]"
          :key="'chart5'"
          class="chart5"
          @price-update="updatePrice"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import ChartContainer from '@/components/ChartContainer.vue';
import DNSEClient from '@/DNSE_api/index';
import { config } from '@/config/index.ts';

const symbol = 'VN30F1M';
const resolutions = ['1', '5'];
const currentPrice = ref<number | null>(null);

// Nhận giá mới từ ChartContainer
const updatePrice = (price: number) => {
  currentPrice.value = price;
};

// Cập nhật title trang khi giá thay đổi
watch(currentPrice, (newPrice) => {
  if (newPrice) {
    document.title = `${symbol} - ${newPrice.toFixed(2)}`;
  } else {
    document.title = symbol;
  }
});

// Auto login 1 lần/ngày
const login = async () => {
  const today = new Date().toISOString().split('T')[0];
  const lastLoginDate = localStorage.getItem('lastLoginDate');
  const token = localStorage.getItem(config.TOKEN_KEY);

  if (token && lastLoginDate === today) return;

  try {
    const dnse_client = new DNSEClient();
    await dnse_client.login();
    localStorage.setItem('lastLoginDate', today || '');
  } catch (e) {
    console.error('Login failed:', e);
  }
};

login();
</script>

<style scoped>
.chart1, .chart5 {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 4px;
}
</style>
