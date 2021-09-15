import { get, post } from "./axiosLib";

const headers = {
  Authorization: `X-ENTERPRISE-TOKEN ${process.env.REACT_APP_API_SECRET}`,
};

export const getExchangeRate = async (source: string, destination: string) => {
  try {
    const ticker = `${source}${destination}`;
    const endpoint = `${process.env.REACT_APP_API_ENDPOINT}/v1/rate?ticker=${ticker}`;

    const rateReq = await get(endpoint, headers);
    return Promise.resolve(rateReq);
  } catch (err) {
    return Promise.reject(err);
  }
};

type PaymentDetails = {
  "mobile-money": {
    network: string;
    phoneNumber: string;
    type: "mobile-money"
  },
  "bank-transfer": {
    bankCode: string | undefined;
    accountName: string;
    bankName: string;
    accountNumber: string | undefined;
    type: "bank-transfer"
  }
}

type TxRequestPayload = {
  phoneNumber?: string;
  sourceAddress: string | undefined;
  fiatAmount: number;
  tokenAmount: number;
  sourceToken: "celo" | "cusd" | "ceur" | undefined;
  transferMethod: string;
  email: string;
  fiat:string;
  token: string;
};

export interface TxPayload extends TxRequestPayload {
  destinationFiat: string;
  transactionHash: any;
  destinationAddress?: any;
  paymentDetails: PaymentDetails["mobile-money"] | PaymentDetails["bank-transfer"];
}

export interface TxBuyPayload extends TxPayload {
  transactionState?: "pending" | "timedout" | "cancelled" | "processing" | "paid" | "completed",
  transactionRef: string,
  depositReceipt?: string,
  transferReceipt?: string,
  _tokenAmount: number,
  _fiatAmount: number,
  _fee: number,
  _timeout: number,
  createdAt: Date,
  processedAt: Date,
}

export const sendTxRequest = async (sourcePayload: TxPayload) => {
  try {
    const endpoint = `${process.env.REACT_APP_API_ENDPOINT}/v1/valora`;

    const payload = {
      ...sourcePayload,
    };

    const rateReq = await post(endpoint, payload, headers);
    return Promise.resolve(rateReq);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const requestTxRef = async (sourcePayload: TxRequestPayload) => {
  try {
    const endpoint = `${process.env.REACT_APP_API_ENDPOINT}/v1/valora/buy`;

    const payload = {
      ...sourcePayload,
    };

    const rateReq = await post(endpoint, payload, headers);
    return Promise.resolve(rateReq);
  } catch (err) {
    return Promise.reject(err);
  }
};
