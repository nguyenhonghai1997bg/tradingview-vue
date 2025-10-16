export const config = {
  ssi_api_url: 'https://iboard-api.ssi.com.vn/statistics/charts/history',
  dnse_api_url: 'https://services.entrade.com.vn/chart-api/v2/ohlcs/derivative',
  ssi_symbol: 'VN30F2406',
  dnse_symbol: 'VN30F1M',
  TOKEN_KEY: 'DNSE_TOKEN',
  TRADING_TOKEN_KEY: 'DNSE_TRADING_TOKEN',
  IS_SSI: true,
  DNSE_TOPICS: [
    "plaintext/quotes/krx/mdds/v2/ohlc/derivative/1/VN30F1M",
    "plaintext/quotes/krx/mdds/tick/v1/roundlot/VN30F1M"
  ],

}