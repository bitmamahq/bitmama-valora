// import { requestTxSig } from "@celo/dappkit";
import { requestAccountAddress, requestTxSig } from '@celo-tools/use-contractkit/lib/dappkit-wallet/dappkit';
import { ContractKit } from "@celo/contractkit";
import {
  AccountAuthResponseSuccess,
  DappKitRequestTypes,
  DappKitResponse,
  DappKitResponseStatus,
  parseDappkitResponseDeeplink, SignTxResponseSuccess, TxToSignParam
} from "@celo/utils";
import { identity, mapValues } from "lodash";
import * as querystring from "querystring";
import { parse } from "url";


const randomString = () => (Math.random() * 100).toString().slice(0, 6)

export const localStorageKey = 'bitmama/dappkit'
export const requestIdKey = 'bitmama/requestId'

/**
 * Parses the response from Dappkit.
 * @param url
 */
export const parseDappkitResponse = url => {
  const whereQuery = url.indexOf("?");
  if (whereQuery === -1) {
    return null;
  }
  const searchNonDeduped = url.slice(whereQuery + 1);
  const allSearch = searchNonDeduped.split("?");
  const newQs = allSearch
    .filter(identity)
    .reduce((acc, qs) => ({ ...acc, ...querystring.parse(qs) }), {});
  const realQs = querystring.stringify(newQs);
  const { protocol, host } = parse(url);
  const result = parseDappkitResponseDeeplink(
    `${protocol}//${host}/?${realQs}`
  );
  if (!result.requestId) {
    return null;
  }
  return result;
};

export const awaitDappkitResponse = async () => {
  return await new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      console.log("awaiting");
      const url = window.location.href;
      try {
        const response = parseDappkitResponse(url);
        if (!response) {
          return;
        }
        if (response.status === DappKitResponseStatus.UNAUTHORIZED) {
          reject(new Error("Unauthorized"));
        } else {
          resolve(response);
        }
        clearInterval(timer);
      } catch (e) {
        reject(e);
      }
    }, 200);
  });
};

export const removeQueryParams = (url, keys) => {
  const whereQuery = url.indexOf("?");
  if (whereQuery === -1) {
    return url;
  }
  const searchNonDeduped = url.slice(whereQuery + 1);
  const allSearch = searchNonDeduped.split("?");
  const newQs = allSearch.reduce(
    (acc, qs) => ({
      ...acc,
      ...mapValues(querystring.parse(qs), v => v?.toString() ?? null)
    }),
    {}
  );
  keys.forEach(key => {
    delete newQs[key];
  });
  const { protocol, host, hash } = parse(url);
  const queryParams = `${querystring.stringify(newQs)}`;
  const resultUrl = `${protocol}//${host}/${hash?.slice(0, hash.indexOf("?"))}`;
  if (queryParams) {
    return `${resultUrl}?${queryParams}`;
  }
  return resultUrl;
};

async function waitForAccountAuth(requestId: string): Promise<AccountAuthResponseSuccess> {
  const url = await waitForResponse()
  const dappKitResponse = parseDappkitResponseDeeplinkHashAware(url)
  if (!dappKitResponse) {
    throw new Error('no dappkit response')
  }
  if (
    requestId === dappKitResponse.requestId &&
    dappKitResponse.type === DappKitRequestTypes.ACCOUNT_ADDRESS &&
    dappKitResponse.status === DappKitResponseStatus.SUCCESS
  ) {
    return dappKitResponse
  }

  console.warn('Unable to parse url', url)
  throw new Error('Unable to parse Valora response')
}

/**
 * Requests auth from the Valora app.
 */
 export const requestValoraAuth = async (): Promise<AccountAuthResponseSuccess> => {
  // clean URL before requesting
  window.location.href = removeQueryParams(window.location.href, [
    'requestId',
    'type',
    'status',
    'address',
    'phoneNumber',
    'pepper',
  ])
  localStorage.removeItem(localStorageKey)
  const requestId = `login-${randomString()}`
  requestAccountAddress({
    requestId,
    dappName: 'Bitmama',
    callback: window.location.href,
  })
  return await waitForAccountAuth(requestId)
}

/**
 * Requests a transaction from the Valora app.
 */
export const requestValoraTransaction = async (
  kit: ContractKit,
  txs: TxToSignParam[]
): Promise<SignTxResponseSuccess> => {
  // window.location.href = removeQueryParams(window.location.href, ['requestId', 'type', 'status', 'rawTxs'])
  await localStorage.removeItem(localStorageKey)
  await localStorage.removeItem(requestIdKey)
  const requestId = `signTransaction-${randomString()}`
  await localStorage.setItem(requestIdKey, requestId)

  // debugger;
  await requestTxSig(kit as any, txs, {
    requestId,
    dappName: 'Bitmama',
    callback: winow.location.origin + window.location.pathname,
  })
  return await waitForSignedTxs(requestId)
}

const parseSearchParamsHashAware = (url: string): URLSearchParams => {
  const whereQuery = url.indexOf('?')
  if (whereQuery === -1) {
    return new URLSearchParams()
  }
  const searchNonDeduped = url.slice(whereQuery + 1)
  const allSearch = searchNonDeduped.split('?')
  const newQs = allSearch
    .filter(identity)
    .reduce((acc, qs) => ({ ...acc, ...Object.fromEntries(new URLSearchParams(qs).entries()) }), {})
  return new URLSearchParams(newQs)
}

export const parseDappkitResponseDeeplinkHashAware = (
  url: string
):
  | (DappKitResponse & {
      requestId: string
    })
  | null => {
  const realQs = parseSearchParamsHashAware(url)
  if (!realQs.get('type') || !realQs.get('requestId')) {
    return null
  }
  return parseDappkitResponseDeeplink(`https://fakehost/?${realQs.toString()}`)
}

async function waitForSignedTxs(requestId: string): Promise<SignTxResponseSuccess> {
  const url = await waitForResponse()
  const dappKitResponse = parseDappkitResponseDeeplinkHashAware(url)
  if (!dappKitResponse) {
    throw new Error('no dappkit response')
  }
  if (
    requestId === dappKitResponse.requestId &&
    dappKitResponse.type === DappKitRequestTypes.SIGN_TX &&
    dappKitResponse.status === DappKitResponseStatus.SUCCESS
  ) {
    return dappKitResponse
  }

  console.warn('Unable to parse url', url)
  throw new Error('Unable to parse Valora response')
}

async function waitForResponse() {
  let running = true;
  while (running) {
    const value = localStorage.getItem(localStorageKey)
    if (value) {
      await localStorage.removeItem(localStorageKey)
      await localStorage.removeItem(requestIdKey)
      running = false;
      return value
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}