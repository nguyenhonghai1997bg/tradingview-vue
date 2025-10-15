import axios, { type AxiosResponse } from 'axios';
import { configAccount } from '../config/config_account';
import { config } from '../config/index.ts';
import type { DerivativeOrderData, DerivativeOrderResponse, LoanPackage, LoginResponse, TradingTokenResponse } from './type.ts';

export class DNSEClient {
  private username: string;
  private password: string;
  private useSmartOtp: boolean;
  private jwtToken: string;
  private tradingToken: string;
  private BASE_URL: string;

  constructor(useSmartOtp: boolean = true) {
    this.username = configAccount.USER_NAME;
    this.password = configAccount.PASSWORD;
    this.useSmartOtp = useSmartOtp;
    
    this.jwtToken = localStorage.getItem(config.TOKEN_KEY)?.trim() || '';
    this.tradingToken = localStorage.getItem(config.TRADING_TOKEN_KEY)?.trim() || '';

    this.BASE_URL = 'https://services.entrade.com.vn';
  }

  async login(): Promise<string | null> {
    const url = `${this.BASE_URL}/dnse-auth-service/login`;
    const payload = { username: this.username, password: this.password };

    try {
      const response: AxiosResponse<LoginResponse> = await axios.post(url, payload);
      this.jwtToken = response.data.token;
      localStorage.setItem(config.TOKEN_KEY, this.jwtToken);
      return this.jwtToken;
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  }

  async authenticateOtp(otp: string | null, isSmartOtp: boolean = true): Promise<string | false> {
    if (this.useSmartOtp && !otp) {
      return false;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const url = `${this.BASE_URL}/dnse-order-service/trading-token`;
      const headers: Record<string, string> = {};

      if (isSmartOtp) {
        await this.login();
        headers['Authorization'] = `Bearer ${this.jwtToken}`;
        headers['smart-otp'] = otp!;
      } else {
        headers['Authorization'] = `Bearer ${this.jwtToken}`;
        headers['otp'] = otp!;
      }

      try {
        const response: AxiosResponse<TradingTokenResponse> = await axios.post(url, {}, { headers });
        console.log(response.data);
        if (response.status === 200) {
          this.tradingToken = response.data.tradingToken;
          localStorage.setItem(config.TRADING_TOKEN_KEY, this.tradingToken);
          return this.tradingToken;
        }
      } catch (error) {
        console.error('OTP authentication failed:', error);
      }
    }
    return false;
  }

  async getAccountInfo(): Promise<any> {
    const url = `${this.BASE_URL}/dnse-user-service/api/me`;
    const headers = { Authorization: `Bearer ${this.jwtToken}` };

    try {
      const response: AxiosResponse = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  async getMailOtp(): Promise<any> {
    await this.login();
    const jwtToken = localStorage.getItem(config.TOKEN_KEY)?.trim() || '';
    const url = `${this.BASE_URL}/dnse-auth-service/api/email-otp`;
    const headers = { Authorization: `Bearer ${jwtToken}` };

    try {
      const response: AxiosResponse = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Failed to get mail OTP:', error);
      throw error;
    }
  }

  async placeDerivativeOrder(
    symbol: string,
    side: string,
    orderType: string,
    price: number,
    quantity: number,
    loanPackageId: string,
    accountNo: string
  ): Promise<DerivativeOrderResponse | any> {
    const jwtToken = localStorage.getItem(config.TOKEN_KEY)?.trim() || '';
    const tradingToken = localStorage.getItem(config.TRADING_TOKEN_KEY)?.trim() || '';

    if (!jwtToken || !tradingToken) {
      console.error('Error: Tokens are missing or invalid.');
      return null;
    }

    const url = `${this.BASE_URL}/dnse-order-service/derivative/orders`;
    const headers = {
      Authorization: `Bearer ${jwtToken}`,
      'Trading-Token': tradingToken,
    };
    const data: DerivativeOrderData = {
      symbol,
      side,
      orderType,
      price,
      quantity,
      loanPackageId,
      accountNo,
    };

    console.log(data);

    try {
      const response: AxiosResponse<DerivativeOrderResponse> = await axios.post(url, data, { headers });
      const result = response.data;
      console.log('\nOrder Information:');
      console.log('Order ID:', result.id ?? 'N/A');
      console.log('Order Type:', result.orderType ?? 'N/A');
      console.log('Order Status:', result.orderStatus ?? 'N/A');
      console.log('Order Quantity:', result.quantity ?? 'N/A');
      console.log('Order Price:', result.price ?? 'N/A');
      console.log('Remaining Quantity:', result.leaveQuantity ?? 'N/A');
      return result;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('HTTP error occurred - Failed to place derivative order:', error.response.data);
        return error.response.data;
      }
      console.error('An error occurred - Failed to place derivative order:', error);
      return error;
    }
  }

  async getAllDeals(): Promise<any> {
    const url = `${this.BASE_URL}/dnse-derivative-core/deals?accountNo=${configAccount.ACCOUNT_NO}`;
    const jwtToken = localStorage.getItem(config.TOKEN_KEY)?.trim() || '';
    const headers = { Authorization: `Bearer ${jwtToken}` };

    try {
      const response: AxiosResponse = await axios.get(url, { headers });
      const responseData = response.data.data ?? [];
      return responseData.length > 0 ? responseData[0] : false;
    } catch (error) {
      console.error('Failed to get deals:', error);
      return false;
    }
  }

  async dealStatus(dealId: string): Promise<string | false> {
    const url = `${this.BASE_URL}/dnse-order-service/derivative/orders/${dealId}?accountNo=${configAccount.ACCOUNT_NO}`;
    const jwtToken = localStorage.getItem(config.TOKEN_KEY)?.trim() || '';
    const headers = { Authorization: `Bearer ${jwtToken}` };

    try {
      const response: AxiosResponse = await axios.get(url, { headers });
      return response.data.orderStatus ?? false;
    } catch (error) {
      console.error('Failed to get deal status:', error);
      return false;
    }
  }

  async getDerivativeLoanPackages(account: string): Promise<void> {
    const url = `${this.BASE_URL}/dnse-order-service/accounts/${account}/derivative-loan-packages`;
    const headers = { Authorization: `Bearer ${this.jwtToken}` };

    try {
      const response: AxiosResponse<{ loanPackages: LoanPackage[] }> = await axios.get(url, { headers });
      if (response.status === 200) {
        const loanPackages = response.data.loanPackages ?? [];
        loanPackages.forEach((pkg, index) => {
          console.log(`\nLoan Package ${index + 1}:`);
          console.log('Package ID:', pkg.id ?? 'N/A');
          console.log('Package Name:', pkg.name ?? 'N/A');
          console.log('Source:', pkg.source ?? 'N/A');
          console.log('Initial Margin Rate:', pkg.initialRate ?? 'N/A');
          console.log('Maintenance Rate (Call Margin):', pkg.maintenanceRate ?? 'N/A');
          console.log('Liquidation Rate:', pkg.liquidRate ?? 'N/A');
          console.log('Trading Fee Info:', pkg.tradingFee ?? 'N/A');
          console.log('Applicable Symbols:', pkg.symbolTypes?.join(', ') ?? 'N/A');
        });
      } else {
        console.error('Error:', response.data);
      }
    } catch (error) {
      console.error('Failed to get loan packages:', error);
    }
  }

  async cancelOrder(dealId: string): Promise<boolean> {
    const url = `${this.BASE_URL}/dnse-order-service/derivative/orders/${dealId}?accountNo=${configAccount.ACCOUNT_NO}`;
    const headers = {
      Authorization: `Bearer ${this.jwtToken}`,
      'Trading-Token': this.tradingToken,
    };

    try {
      const response: AxiosResponse = await axios.delete(url, { headers });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }
}
