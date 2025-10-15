export interface LoginResponse {
  token: string;
}

export interface TradingTokenResponse {
  tradingToken: string;
}

export interface DerivativeOrderData {
  symbol: string;
  side: string;
  orderType: string;
  price: number;
  quantity: number;
  loanPackageId: string;
  accountNo: string;
}

export interface DerivativeOrderResponse {
  id?: string;
  orderType?: string;
  orderStatus?: string;
  quantity?: number;
  price?: number;
  leaveQuantity?: number;
}

export interface LoanPackage {
  id?: string;
  name?: string;
  source?: string;
  initialRate?: number;
  maintenanceRate?: number;
  liquidRate?: number;
  tradingFee?: string;
  symbolTypes?: string[];
}


export interface StockSSIDataResponse {
  code: string;
  message: string;
  data: {
    t: number[];
    o: number[];
    h: number[];
    l: number[];
    c: number[];
    v: number[];
    s: string;
  };
  paging: null;
  status: string;
}