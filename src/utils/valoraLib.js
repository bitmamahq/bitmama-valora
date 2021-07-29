import {
  // eslint-disable-next-line no-unused-vars
  AccountAuthRequest,
  DappKitResponseStatus,
  parseDappkitResponseDeeplink,
  // eslint-disable-next-line no-unused-vars
  serializeDappKitRequestDeeplink,
  SignTxRequest
} from "@celo/utils";

// import { requestTxSig } from "@celo/dappkit";

import { identity, mapValues } from "lodash";
import * as querystring from "querystring";
import { parse } from "url";

// Gets the url redirected from Valora that is used to update the page
// eslint-disable-next-line no-unused-vars
async function waitForValoraResponse() {
  const localStorageKey = "valoraRedirect";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = localStorage.getItem(localStorageKey);
    if (value) {
      localStorage.removeItem(localStorageKey);
      return value;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

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

const cleanCallbackUrl = url => {
  return removeQueryParams(url, []);
};

/**
 * Requests auth from the Valora app.
 */
export const requestValoraAuth = async () => {
  // const requestId = "login";
  // const dappName = "Bitmama";
  // const callback = cleanCallbackUrl(window.location.href);
  // window.location.href = serializeDappKitRequestDeeplink(
  //   AccountAuthRequest({
  //     requestId,
  //     dappName,
  //     callback
  //   })
  // );
  // window.location.href = await waitForValoraResponse();
  window.location.href = `celo://wallet/dappkit?type=account_address&requestId=login&callback=http%3A%2F%2F192.168.0.175%3A8080%2F&dappName=Bitmama`;
  return "";
};

/**
 * Requests auth from the Valora app.
 */
export const requestValoraTransaction = async txs => {
  const txsArr = [];
  txsArr.push(txs);
  const requestId = "make-transaction";
  const dappName = "Bitmama";
  const callback = cleanCallbackUrl(window.location.href);
  window.location.href = serializeDappKitRequestDeeplink(
    SignTxRequest(txsArr, {
      requestId,
      dappName,
      callback
    })
  );

  console.log("TXS:: ", txs);

  // window.location.href = `celo://wallet/pay?address=${txs.to}&amount=${txs.amount}&currencyCode=USD&displayName=Bitmama&comment=${encodeURI(txs.comment)}&callback=http%3A%2F%2F192.168.0.175%3A8080%2F`;
  window.location.href = await waitForValoraResponse();
  return "";
};
