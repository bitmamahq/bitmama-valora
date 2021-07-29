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
