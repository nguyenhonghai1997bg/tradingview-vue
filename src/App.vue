<template>
  <div class="d-flex">
    <div style="width: 50%;float: left;">
      <ChartContainer :symbol="symbol" :resolution="'1'" :key="'chart1'" class="chart1"  />
    </div>
    <div style="width: 50%;float: left;">
      <ChartContainer :symbol="symbol" :resolution="'5'" :key="'chart5'"  class="chart5"  />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ChartContainer from '@/components/ChartContainer.vue';
import DNSEClient from '@/DNSE_api/index';
import { config } from '@/config/index.ts';

const symbol = 'VN30F1M';

const login = async () => {
  const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
  const lastLoginDate = localStorage.getItem('lastLoginDate');
  const token = localStorage.getItem(config.TOKEN_KEY);

  // Nếu đã login hôm nay => bỏ qua
  if (token && lastLoginDate === today) {
    return;
  }

  try {
    const dnse_client = new DNSEClient();
    await dnse_client.login();

    // Lưu ngày login
    localStorage.setItem('lastLoginDate', today || '');
  } catch (e) {
    console.error('Login failed:', e);
  }
};

// Chạy 1 lần khi load
login();
</script>
