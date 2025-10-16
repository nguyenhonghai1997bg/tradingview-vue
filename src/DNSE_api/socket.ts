import mqtt from 'mqtt'
import { configAccount } from '@/config/config_account'
import { config } from '@/config'

export class DNSESocket {
  private client: mqtt.MqttClient | null = null

  constructor(
    private symbol: string,
    private resolution: string,
    private onMessage: (msg: any) => void
  ) {}

  connect() {
    const token = localStorage.getItem(config.TOKEN_KEY)
    if (!token) {
      console.warn('⚠️ Missing token, cannot connect MQTT.')
      return
    }

    this.client = mqtt.connect('wss://datafeed-lts-krx.dnse.com.vn:443/wss', {
      clientId: `dnse-price-json-mqtt-ws-sub-${configAccount.investorId}-${Math.random().toString(16).substr(2, 8)}`,
      username: configAccount.investorId,
      password: token,
      protocol: 'wss',
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 5000,
      rejectUnauthorized: false,
    })

    this.client.on('connect', () => {
      console.log('✅ MQTT connected')
      const topics = [
        `plaintext/quotes/krx/mdds/v2/ohlc/derivative/${this.resolution}/${this.symbol}`,
        `plaintext/quotes/krx/mdds/tick/v1/roundlot/${this.symbol}`,
      ]
      topics.forEach(topic => this.client?.subscribe(topic, { qos: 2 }))
    })

    this.client.on('message', (topic, message) => {
      try {
        const msg = JSON.parse(message.toString())
        if (msg?.symbol === this.symbol) {
          this.onMessage(msg)
        }
      } catch (err) {
        console.error('❌ Parse message error:', err)
      }
    })

    this.client.on('error', err => console.error('❌ MQTT error:', err.message))
    this.client.on('close', () => console.warn('⚠️ MQTT connection closed'))
    this.client.on('reconnect', () => console.log('🔁 Reconnecting...'))
  }

  disconnect() {
    if (this.client) {
      this.client.end(true)
      this.client = null
      console.log('🛑 MQTT disconnected')
    }
  }
}
