import { CeloContract, newKit, StableToken } from "@celo/contractkit";
import { GoldTokenWrapper } from "@celo/contractkit/lib/wrappers/GoldTokenWrapper";
import { StableTokenWrapper } from "@celo/contractkit/lib/wrappers/StableTokenWrapper";
import { DappKitRequestTypes, DappKitResponseStatus } from "@celo/utils";
// import { ethers } from "ethers";
import { requestValoraTransaction } from "./valoraLib";
import _ from "lodash";

export const kit = newKit(process.env.REACT_APP_CELO_ENDPOINT as string);
export const web3 = kit.web3;

// Convert number with exponential(e) to long decimal
const noExponents = (value: string | number) => {
  let data;
  if (typeof value === "number") {
    data = String(value).split(/[eE]/);
  } else {
    data = value.split(/[eE]/);
  }

  if (data.length === 1) return data[0];

  let z = "",
    sign = value < 0 ? "-" : "",
    str = data[0].replace(".", ""),
    mag = Number(data[1]) + 1;

  if (mag < 0) {
    z = sign + "0.";
    while (mag++) z += "0";
    return z + str.replace(/^-/, "");
  }
  mag -= str.length;
  while (mag--) z += "0";
  return str + z;
};

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
        const dollarToken = await kit.contracts.getStableToken(StableToken.cUSD);
        const celoBalance = await dollarToken.balanceOf(address);
        const bnBalance = web3.utils.toBN(noExponents(celoBalance.toString()));

        balance = _.toNumber(web3.utils.fromWei(bnBalance.toString(), "ether"));
        break;
      }

      case "celo": {
        const goldToken = await kit.contracts.getGoldToken();
        const celoBalance = await goldToken.balanceOf(address);
        const bnBalance = web3.utils.toBN(noExponents(celoBalance.toString()));

        balance = _.toNumber(web3.utils.fromWei(bnBalance.toString(), "ether"));
        break;
      }

      case "ceur": {
        const euroToken = await kit.contracts.getStableToken(StableToken.cEUR);
        const celoBalance = await euroToken.balanceOf(address);
        const bnBalance = web3.utils.toBN(noExponents(celoBalance.toString()));

        balance = _.toNumber(web3.utils.fromWei(bnBalance.toString(), "ether"));
        break;
      }

      default:
        balance = 0;
        break;
    }

    return balance;
  } catch (err) {
    console.log("ERR::: ", err);
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

export const transferToken = async (token: string, amount: number, fromAddress: string, comment = ""): Promise<any> => {
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

    const stableAddress = await kit.registry.addressFor(CeloContract.StableToken);
    const baseNonce = await kit.connection.nonce(fromAddress);

    // @ts-ignore
    const encodedData = tokenContract.transfer(process.env.REACT_APP_CELO_SINK as string, kit.web3.utils.toWei(String(amount), "ether")).txo.encodeABI();

    // const encodedData = ethers.utils.defaultAbiCoder
    //   .encode(["address", "uint256"], [process.env.REACT_APP_CELO_SINK, kit.web3.utils.toWei(String(amount), "ether")])
    //   .substring(2);

    // @ts-ignore
    // const methodId = tokenContract.methodIds.transfer.substring(2);
    // const transferData = `0x${methodId}${encodedData}`;

    const gasEstimate = await kit.connection.estimateGas({
      feeCurrency: stableAddress,
      from: fromAddress,
      to: tokenAddress,
      data: encodedData,
    });

    const transactionParameters = {
      to: tokenAddress,
      from: fromAddress,
      txData: encodedData,
      estimatedGas: gasEstimate,
      nonce: baseNonce + 1,
      feeCurrencyAddress: stableAddress,
      value: "0",
    };

    try {
      const resp = await requestValoraTransaction(kit, [transactionParameters]);
      if (resp.type === DappKitRequestTypes.SIGN_TX && resp.status === DappKitResponseStatus.SUCCESS) {
        const sent = web3.eth.sendSignedTransaction(resp.rawTxs[0]);
        return new Promise((resolve, reject) => {
          sent.on("transactionHash", (hash) => {
            resolve({ hash, destinationAddress: tokenAddress });
          });
          sent.catch((err) => reject(err));
        });
      }
    } catch (e) {
      console.error("[Valora] Failed to send transaction", e);
      throw e;
    }
  } catch (err) {
    console.log("Error ", err);
    return Promise.reject(err);
  }
};
