<template>
  <div>
    <div>
      <ChartContainer />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ChartContainer from '@/components/ChartContainer.vue';
import DNSEClient from '@/DNSE_api/index';
import { config } from '@/config/index.ts';

const login = async () => {
  if (localStorage.getItem(config.TOKEN_KEY)) {
    return
  }

  try {
    const dnse_client = new DNSEClient()
    await dnse_client.login()
  } catch (e) {
    console.log(e)
  }
}

login()

</script>