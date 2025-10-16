<template>
  <div style="max-width: 100%; overflow-x: hidden;">
    <div class="row mt-2">
      <div class="col-md-6">
        <h6 class="text-center">{{ symbol }} ({{ resolutions[0] }} phút)</h6>
        <ChartContainer
          :symbol="symbol"
          :resolution="resolutions[0]"
          :key="'chart1'"
          class="chart1"
        />
      </div>

      <div class="col-md-6">
        <h6 class="text-center">{{ symbol }} ({{ resolutions[1] }} phút)</h6>
        <ChartContainer
          :symbol="symbol"
          :resolution="resolutions[1]"
          :key="'chart5'"
          class="chart5"
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
const resolutions = [1, 5];

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
