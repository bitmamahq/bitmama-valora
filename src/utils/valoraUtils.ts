import { requestTxSig, waitForSignedTxs } from "@celo-tools/use-contractkit/lib/dappkit-wallet/dappkit";
import { ContractKit } from "@celo/contractkit";
import {
  // AccountAuthResponseSuccess,
  // DappKitRequestTypes,
  DappKitResponse,
  // DappKitResponseStatus,
  parseDappkitResponseDeeplink
} from "@celo/utils";
import { identity } from "lodash";
// import {
//   FeeCurrency,
  // waitForSignedTxs,
//   requestTxSig,
// } from "@celo/dappkit/lib/web";

export const removeQueryParams = (url: string, keys: string[]): string => {
  const params = parseSearchParamsHashAware(url);
  const whereQuery = url.indexOf("?");
  const urlNoSearchParams = whereQuery !== -1 ? url.slice(0, whereQuery) : url;
  keys.forEach((key) => {
    params.delete(key);
  });
  // @ts-ignore
  if ([...params.keys()].length > 0) {
    return `${urlNoSearchParams}?${params}`;
  }
  return url;
};

const parseSearchParamsHashAware = (url: string): URLSearchParams => {
  const whereQuery = url.indexOf("?");
  if (whereQuery === -1) {
    return new URLSearchParams();
  }
  const searchNonDeduped = url.slice(whereQuery + 1);
  const allSearch = searchNonDeduped.split("?");
  const newQs = allSearch.filter(identity).reduce(
    (acc, qs) => ({
      ...acc,
      ...Object.fromEntries(new URLSearchParams(qs).entries()),
    }),
    {}
  );
  return new URLSearchParams(newQs);
};

export const parseDappkitResponseDeeplinkHashAware = (
  url: string
):
  | (DappKitResponse & {
      requestId: string;
    })
  | null => {
  const realQs = parseSearchParamsHashAware(url);
  if (!realQs.get("type") || !realQs.get("requestId")) {
    return null;
  }
  return parseDappkitResponseDeeplink(`https://fakehost/?${realQs.toString()}`);
};

const localStorageKey = "bitmama/dappkit";

// hack to get around deeplinking issue where new tabs are opened
// and the url hash state is not respected (Note this implementation
// of dappkit doesn't use URL hashes to always force the newtab experience).
// don't do this on IOS
if (typeof window !== "undefined" && !navigator.userAgent.includes("iPhone")) {
  const params = parseSearchParamsHashAware(window.location.href);
  if (params.get("type") && params.get("requestId")) {
    localStorage.setItem(localStorageKey, window.location.href);
    window.close();
  }
}

// async function waitForResponse() {
//   // eslint-disable-next-line no-constant-condition
//   while (true) {
//     // handle redirect
//     const params = parseSearchParamsHashAware(window.location.href);
//     if (params.get("type") && params.get("requestId")) {
//       localStorage.setItem(localStorageKey, window.location.href);
//     }
//
//     const value = localStorage.getItem(localStorageKey);
//     if (value) {
//       localStorage.removeItem(localStorageKey);
//       return value;
//     }
//     await new Promise((resolve) => setTimeout(resolve, 100));
//   }
// }

// async function waitForSignedTxs(
//   requestId: string
// ): Promise<SignTxResponseSuccess> {
//   const url = await waitForResponse();
//   const dappKitResponse = parseDappkitResponseDeeplinkHashAware(url);
//   if (!dappKitResponse) {
//     throw new Error("no dappkit response");
//   }
//   if (
//     requestId === dappKitResponse.requestId &&
//     dappKitResponse.type === DappKitRequestTypes.SIGN_TX &&
//     dappKitResponse.status === DappKitResponseStatus.SUCCESS
//   ) {
//     return dappKitResponse;
//   }
//
//   console.warn("Unable to parse url", url);
//   throw new Error("Unable to parse Valora response");
// }

// const randomString = () => (Math.random() * 100).toString().slice(0, 6);

/**
 * Requests a transaction from the Valora app.
 */
// export const requestValoraTransaction = async (
//   kit: ContractKit,
//   txs: TxToSignParam[]
// ): Promise<SignTxResponseSuccess> => {
//   window.location.href = removeQueryParams(window.location.href, [
//     "requestId",
//     "type",
//     "status",
//     "rawTxs",
//   ]);
//   localStorage.removeItem(localStorageKey);
//   // const requestId = `signTransaction-${randomString()}`;
//   const requestId = "transfer";
//   await requestTxSig(kit, txs, {
//     requestId,
//     dappName: "Bitmama",
//     callback: window.location.href,
//   });
//   return await waitForSignedTxs(requestId);
// };

export const valoraTransaction = async (kit: ContractKit): Promise<any> => {
  const requestId = "transfer";
  const dappName = "Bitmama";

  // Replace with your own account address and desired value in WEI to transfer
  const transferToAccount = "0xbe3908aCEC362AF0382ebc56E06b82ce819b19E8";
  const transferValue = "1";

  // Create a transaction object using ContractKit
  // @ts-ignore
  const stableToken = await kit.contracts.getStableToken();
  const txObject = stableToken.transfer(
    transferToAccount,
    kit.web3.utils.toWei(String(transferValue), "ether")
  ).txo;

  console.log("TXOBJ:: ", txObject);

  // Send a request to the Celo wallet to send an update transaction to the HelloWorld contract
  await requestTxSig(
    // @ts-ignore
    kit,
    [
      {
        tx: txObject,
        from: "0xBaff2Fbc4aFb436b39D93b6c5D5591704c561043",
        to: stableToken.address,
      },
    ],
    { requestId, dappName, callback: window.location.href }
  );

  let rawTx;
  try {
    const dappkitResponse = await waitForSignedTxs(requestId);
    rawTx = dappkitResponse.rawTxs[0];
  } catch (error) {
    console.log(error);
    return;
  }

  console.log("REW TX::: ", rawTx);

  // Wait for transaction result and check for success
  const tx = await kit.connection.sendSignedTransaction(rawTx);
  const receipt = await tx.waitReceipt();
  console.log({receipt})
};
