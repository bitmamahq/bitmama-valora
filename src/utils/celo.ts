import { CeloContract, newKit, StableToken } from "@celo/contractkit";
import { GoldTokenWrapper } from "@celo/contractkit/lib/wrappers/GoldTokenWrapper";
// import {
//   requestAccountAddress,
//   waitForAccountAuth,
// } from "@celo/dappkit/lib/web";
import { StableTokenWrapper } from "@celo/contractkit/lib/wrappers/StableTokenWrapper";
import { DappKitRequestTypes, DappKitResponseStatus } from "@celo/utils";
import { ethers } from "ethers";
import { requestValoraTransaction } from "./valoraLib";
import { valoraTransaction } from "./valoraUtils";

export const kit = newKit(process.env.REACT_APP_CELO_ENDPOINT as string);
export const web3 = kit.web3;

// export const requestWalletAuth = async () => {
//   try {
//     const requestId = "login";
//     const dappName = "Bitmama";
//     await requestAccountAddress({
//       requestId,
//       dappName: dappName,
//       callback: window.location.href
//     });
//     const response = await waitForAccountAuth(requestId);
//     return Promise.resolve({
//       address: response.address,
//       phoneNumber: response.phoneNumber
//     });
//   } catch (err) {
//     console.log("ERROR IN USER AUTH::: ", err);
//     return Promise.reject(err);
//   }
// };

export const getBalance = async (address: string, token: string) => {
  try {
    if (!token || String(token).trim().length <= 0) {
      throw new Error("TOKEN_NOT_SPECIFIED");
    }

    if (!address || String(address).trim().length <= 0) {
      throw new Error("ADDRESS_NOT_SPECIFIED");
    }

    let balance = 0;

    switch (token) {
      case "cusd": {
        const dollarToken = await kit.contracts.getStableToken(
          StableToken.cUSD
        );
        const celoBalance = await dollarToken.balanceOf(address);

        balance = Number(web3.utils.fromWei(celoBalance.toString(), "ether"));
        break;
      }

      case "celo": {
        const goldToken = await kit.contracts.getGoldToken();
        const celoBalance = await goldToken.balanceOf(address);

        balance = Number(web3.utils.fromWei(celoBalance.toString(), "ether"));
        break;
      }

      case "ceur": {
        const euroToken = await kit.contracts.getStableToken(StableToken.cEUR);
        const celoBalance = await euroToken.balanceOf(address);

        balance = Number(web3.utils.fromWei(celoBalance.toString(), "ether"));
        break;
      }

      default:
        balance = 0;
        break;
    }

    return balance;
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getTransaction = async (trxHash: any) => {
  try {
    if (!trxHash) {
      return;
    }

    const trx = await kit.web3.eth.getTransaction(trxHash);
    return Promise.resolve(trx);
  } catch (err) {
    return Promise.reject(err);
  }
};

// export const transferToken = async (
//   token,
//   amount,
//   fromAddress,
//   // eslint-disable-next-line no-unused-vars
//   comment = ""
// ) => {
//   try {
//     console.log('ADDRESS FROM::: ', fromAddress)
//     if (!token || String(token).trim().length <= 0) {
//       throw new Error("TOKEN_NOT_SPECIFIED");
//     }
//
//     if (!amount || amount <= 0) {
//       throw new Error("INVALID_AMOUNT");
//     }
//
//     const tokenBalance = await getBalance(fromAddress, token);
//
//     if (amount >= tokenBalance) {
//       throw new Error("INSUFFICIENT_BALANCE");
//     }
//     console.log("Balance:: ", tokenBalance);
//
//     let tokenContract = "",
//       rawTx;
//
//     const requestId = "transfer";
//     const dappName = "Bitmama";
//     const transferToAccount = process.env.VUE_APP_CELO_SINK;
//
//     if (token === "cusd") {
//       tokenContract = await kit.contracts.getStableToken("cUSD");
//     } else if (token === "ceur") {
//       tokenContract = await kit.contracts.getStableToken("cEUR");
//     } else if (token === "celo") {
//       tokenContract = await kit.contracts.getGoldToken();
//     }
//
//     const txObject = tokenContract.transfer(
//       transferToAccount,
//       kit.web3.utils.toWei(String(amount), "ether")
//     ).txo;
//
//     await requestTxSig(
//       kit,
//       [
//         {
//           tx: txObject,
//           from: fromAddress,
//           to: tokenContract.address,
//           feeCurrency: FeeCurrency.cUSD
//         }
//       ],
//       { requestId, dappName, callback: window.location.href }
//     );
//
//     const response = await waitForSignedTxs(requestId);
//     rawTx = response.rawTxs[0];
//
//     const tx = await kit.connection.sendSignedTransaction(rawTx);
//     const receipt = await tx.waitReceipt();
//
//     // if (receipt.status) {
//     //   status = "transfer succeeded with receipt: " + receipt.transactionHash;
//     // } else {
//     //   console.log(JSON.stringify(receipt))
//     //   status = "failed to send transaction"
//     // }
//
//     console.log("TRX RECEIPT::: ", receipt);
//     return receipt;
//   } catch (err) {
//     console.log("Error in Transfer:: ", err);
//     return Promise.reject(err);
//   }
// };

export const transferToken2 = async () => {
  const trans = await valoraTransaction(kit);
  console.log("TRX::: ", trans);
};

export const transferToken = async (
  token: string,
  amount: number,
  fromAddress: string,
  comment = ""
) => {
  try {
    console.log("DETAILS:: ", token, amount, fromAddress, comment);
    if (!token || String(token).trim().length <= 0) {
      throw new Error("TOKEN_NOT_SPECIFIED");
    }

    if (!amount || amount <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    const tokenBalance = await getBalance(fromAddress, token);

    if (amount >= tokenBalance) {
      throw new Error("INSUFFICIENT_BALANCE");
    }
    console.log("Balance:: ", tokenBalance);

    let tokenContract: StableTokenWrapper | GoldTokenWrapper;
    let tokenAddress = "";

    if (token === "cusd") {
      tokenContract = await kit.contracts.getStableToken(StableToken.cUSD);
      tokenAddress = tokenContract.address;
    } else if (token === "ceur") {
      tokenContract = await kit.contracts.getStableToken(StableToken.cEUR);
      tokenAddress = tokenContract.address;
    } else if (token === "celo") {
      tokenContract = await kit.contracts.getGoldToken();
      tokenAddress = tokenContract.address;
    }

    const stableAddress = await kit.registry.addressFor(CeloContract.StableToken)
    const baseNonce = await kit.connection.nonce(fromAddress)


    const encodedData = ethers.utils.defaultAbiCoder
      .encode(
        ["address", "uint256"],
        [
          process.env.REACT_APP_CELO_SINK,
          kit.web3.utils.toWei(String(1), "ether"),
        ]
      )
      .substring(2);

    console.log("ENCODED DATA::: ");

    // @ts-ignore
    const methodId = tokenContract.methodIds.transfer.substring(2);
    // const methodId = "";

    const transferData = `0x${methodId}${encodedData}`;
    console.log("TRANSFA DATA::", transferData);

    const gasEstimate = await kit.connection.estimateGas({
      feeCurrency: stableAddress,
      from: fromAddress,
      to: fromAddress,
      data: transferData,
    })

    const transactionParameters = {
      to: tokenAddress,
      from: fromAddress,
      txData: transferData,
      estimatedGas: gasEstimate || 1000,
      nonce: baseNonce + 0,
      feeCurrencyAddress: stableAddress,
      value: '0',
    };

    // const kito = await kit.contracts.getGoldToken();

    // const tre = tokenContract.methods.transferWithComment(
    //   process.env.VUE_APP_CELO_SINK,
    //   kit.web3.utils.toWei(String(amount), "ether"),
    //   "ANYTHING"
    // );
    //
    // await kit.sendTransactionObject(tre, { from: fromAddress });

    // const txHash = await window.celo.request({
    //   method: "eth_sendTransaction",
    //   params: [transactionParameters]
    // });

    // const trx = [];
    // trx.push(transactionParameters);
    // console.log("TRANS:: ", trx);
    try{
      const resp = await requestValoraTransaction(kit, [transactionParameters]);
      console.log("valora response: ", resp);
      if (resp.type === DappKitRequestTypes.SIGN_TX && resp.status === DappKitResponseStatus.SUCCESS) {
        const sent = web3.eth.sendSignedTransaction(resp.rawTxs[0])
        return new Promise((resolve, reject) => {
          sent.on('transactionHash', (hash) => {
            console.log('Valora TX sent', hash)
            resolve(hash)
          })
          sent.catch((err) => reject(err))
        })
      }
    } catch (e) {
      console.error('[Valora] Failed to send transaction', e)
      throw e
    }
  } catch (err) {
    console.log("Error ", err)
    return Promise.reject(err);
  }
};
