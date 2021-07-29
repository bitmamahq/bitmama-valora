import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { IBank, IBankDetail, IBankDetailDto } from "../interfaces";

// Define a service using a base URL and expected endpoints
export const bankApi = createApi({
  reducerPath: "bank",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.REACT_APP_API_ENDPOINT}/v1/`,
    prepareHeaders: (headers, _) => {
      headers.set(
        "Authorization",
        `X-ENTERPRISE-TOKEN ${process.env.REACT_APP_API_SECRET}`
      );
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getBanksByCountry: builder.query<IBank[], string>({
      query: (country) => `banks/${country}`,
      transformResponse: (res: any) => res.message.data as IBank[],
    }),
    resolveAccount: builder.mutation<IBankDetail, IBankDetailDto>({
      query: (input) => ({
        url: `banks/resolve`,
        method: "POST",
        body: input,
      }),

      transformResponse: (res: any) => res.message.data as IBankDetail,
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetBanksByCountryQuery, useResolveAccountMutation } = bankApi;
