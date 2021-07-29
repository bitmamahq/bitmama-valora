export interface IBank {
  id: number;
  code: string;
  name: string;
}

export interface IBankDetailDto {
  accountNumber: string;
  bankCode: string;
}

export interface IBankDetail {
  account_number: string;
  account_name: string;
}

export interface IExchangeRate {
  buy: number;
  sell: number;
}
