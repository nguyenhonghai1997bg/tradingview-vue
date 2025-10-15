import axios from 'axios';
import { config } from '../config';
import { timeToTimestamp } from '../helpers/date_helper';

// const apiUrl = config.IS_SSI ? config.ssi_api_url : config.dnse_api_url;
const apiUrl = config.IS_SSI ? '/api/statistics/charts/history' : '/api/chart-api/v2/ohlcs/derivative'; // Điều chỉnh endpoint cụ thể

async function getStockData(symbol : string, resolution: string = '1', fromDate: Date, endDate: Date) {
  const timestampFrom = timeToTimestamp(fromDate);
  const timestampTo = timeToTimestamp(endDate);
  const HEADERS = {
    'content-type': 'application/x-www-form-urlencoded',
  };
  const params = {
    symbol,
    resolution,
    from: timestampFrom,
    to: timestampTo
  };

  try {
    const response = await axios.get(apiUrl, { params, headers: HEADERS });
    const data = config.IS_SSI ? response.data : response.data;
    return data;
  } catch (error) {
    console.error('Failed to fetch stock data:', error);
    throw error;
  }
}

export { getStockData };