import { get } from "./axiosLib";

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

type TxPayload = {
  sourceToken: "ceur" | "celo" | "cusd",
  destinationFiat: "ngn" | "ghs",
  tokenAmount: number,
  transferMethod: "bank-transfer" | "mobile-money",
  email: string,
  phoneNumber?: string,
  fiatAmount: number,
  sourceAddress: string,
  paymentDetails: Record<string, string>,
  txHash: string,
}

export const sendTxRequest = async (sourcePayload: TxPayload, destination: string) => {
  try {
    const endpoint = `${process.env.REACT_APP_API_ENDPOINT}/v1/valora`;

    const payload = {
      ...sourcePayload,
      destinationAddress: process.env.REACT_APP_DEST_ADDRESS || "0x8830C6AaC81a286685c4F8e9fCD8815D0B57216C",
    }

    const rateReq = await post(endpoint, payload, headers);
    return Promise.resolve(rateReq);
  } catch (err) {
    return Promise.reject(err);
  }
};
