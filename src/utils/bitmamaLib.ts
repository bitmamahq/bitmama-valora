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

export type PaymentDetails = {
  "mobile-money": {
    network: string;
    phoneNumber: string;
  },
  "bank-transfer": {
    bankCode: string | undefined;
    accountName: string;
    bankName: string;
    accountNumber: string | undefined;
  }
}

export type TxRequestStatus = "fiat-deposited" | string

export type TxRequestPayload = {
  phoneNumber?: string;
  fiatAmount: number;
  tokenAmount: number;
  sourceCurrency: "ngn" | "ghs";
  transferMethod: keyof PaymentDetails;
  email: string;
  destinationToken: "celo" | "cusd" | "ceur" | undefined;
  destinationAddress?: any;
};

export interface TxPayload {
  phoneNumber?: string;
  fiatAmount: number;
  tokenAmount: number;
  transferMethod: keyof PaymentDetails;
  email: string;
  fiat:string;
  destinationAddress?: any;
  destinationToken: TxRequestPayload["sourceCurrency"];
  sourceToken: TxRequestPayload["destinationToken"];
  token: string;
  sourceAddress: string | undefined;
  destinationFiat: string;
  transactionHash: any;
  paymentDetails: PaymentDetails["mobile-money"] | PaymentDetails["bank-transfer"];
}

export interface TxBuyPayload extends TxRequestPayload {
  status: TxRequestStatus
  paymentDetails: PaymentDetails["mobile-money"] | PaymentDetails["bank-transfer"];
  transactionState?: "pending" | "timedout" | "cancelled" | "processing" | "paid" | "completed",
  transactionReference: string,
  depositReceipt?: string,
  transferReceipt?: string,
  _tokenAmount: number,
  _fiatAmount: number,
  _fee: number,
  timeout: number,
  createdAt: Date,
  processedAt: Date,
}

export type TxUpdate = "paid" | "cancel"

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

export const updateTxRef = async (ref: string, operation: TxUpdate) => {
  try {
    let endpoint = `${process.env.REACT_APP_API_ENDPOINT}/v1/valora/buy/confirm?transactionRef=${ref}`;
    if(operation === "cancel") {
      endpoint = `${process.env.REACT_APP_API_ENDPOINT}/v1/valora/buy/cancel?transactionRef=${ref}`;
    }
    const rateReq = await get(endpoint, headers);
    return Promise.resolve(rateReq);
  } catch (err) {
    return Promise.reject(err);
  }
};
