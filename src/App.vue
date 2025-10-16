<template>
  <div class="resizable-container">
    <div 
      class="chart-pane" 
      :class="{ 'full-screen': isFullScreen === 1, 'hidden-pane': isFullScreen === 5 }"
      :style="{ width: getPaneWidth(1) }"
    >
      <div class="d-flex justify-content-between align-items-center mt-2 mx-3">
        <h6 class="text-center mb-0">{{ symbol }} ({{ resolutions[0] }} phút)</h6>
        <button 
          @click="toggleFullScreen(1)" 
          class="btn btn-sm btn-outline-secondary"
          style="font-size: 0.75rem; padding: 0.1rem 0.5rem;"
        >
          {{ isFullScreen === 1 ? 'Thu nhỏ' : 'Full màn hình' }}
        </button>
      </div>

      <div class="chart-wrapper"> 
        <ChartContainer
          :symbol="symbol"
          :resolution="resolutions[0]"
          :key="'chart1'"
          class="chart1"
        />
      </div>
    </div>

    <div class="splitter" v-if="isFullScreen === 0" @mousedown="startDrag"></div>

    <div 
      class="chart-pane" 
      :class="{ 'full-screen': isFullScreen === 5, 'hidden-pane': isFullScreen === 1 }"
      :style="{ width: getPaneWidth(5) }"
    >
      <div class="d-flex justify-content-between align-items-center mt-2 mx-3">
        <h6 class="text-center mb-0">{{ symbol }} ({{ resolutions[1] }} phút)</h6>
        <button 
          @click="toggleFullScreen(5)" 
          class="btn btn-sm btn-outline-secondary"
          style="font-size: 0.75rem; padding: 0.1rem 0.5rem;"
        >
          {{ isFullScreen === 5 ? 'Thu nhỏ' : 'Full màn hình' }}
        </button>
      </div>

      <div class="chart-wrapper">
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
import { ref, onUnmounted } from 'vue';
import ChartContainer from '@/components/ChartContainer.vue';
import DNSEClient from '@/DNSE_api/index';
import { config } from '@/config/index.ts';

const symbol = 'VN30F1M';
const resolutions = [1, 5];

// === Logic Full Screen ===
// 0: Chia đôi, 1: Chart 1 phút Full, 5: Chart 5 phút Full
const isFullScreen = ref(0); 

const toggleFullScreen = (res: number) => {
  if (isFullScreen.value === res) {
    isFullScreen.value = 0; // Trở lại chế độ chia đôi
  } else {
    isFullScreen.value = res; // Chuyển sang Full Screen
  }
  // Đợi Vue cập nhật DOM, sau đó kích hoạt resize
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 10);
};

// Tính toán width cho từng pane
const getPaneWidth = (res: number): string => {
  if (isFullScreen.value === res) {
    return '100%'; // Full screen
  }
  if (isFullScreen.value !== 0) {
    return '0'; // Ẩn khi biểu đồ kia Full screen
  }
  // Chế độ chia đôi bình thường (dùng logic kéo thả)
  return res === resolutions[0] ? `${leftWidth.value}%` : `${100 - leftWidth.value}%`;
};

// === Logic Resizing (Giữ nguyên, chỉ cần đảm bảo nó KHÔNG chạy khi Full Screen) ===
const leftWidth = ref(50); 
let isDragging = false;

const startDrag = () => {
  if (isFullScreen.value !== 0) return; // Ngăn kéo thả khi đang full screen
  isDragging = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging) return;

  const container = document.querySelector('.resizable-container') as HTMLElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
  
  leftWidth.value = Math.min(80, Math.max(20, newWidth));
  
  window.dispatchEvent(new Event('resize')); 
};

const stopDrag = () => {
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
};

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
// ======================

// Auto login (Giữ nguyên)
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
