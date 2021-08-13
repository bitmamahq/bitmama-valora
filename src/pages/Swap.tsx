import { RepeatIcon } from "@chakra-ui/icons";
import {
  Badge, Box, CircularProgress, Container,
  FormControl,
  Heading,Center, Flex,
  HStack, IconButton, Image, InputGroup, InputLeftElement, InputRightElement, useToast, VStack
} from "@chakra-ui/react";
import { RouterProps } from "@reach/router";
import debounce from "lodash/debounce";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, Select } from "../components";
import { IExchangeRate } from "../interfaces";
import {
  useGetBanksByCountryQuery,
  useResolveAccountMutation
} from "../services/bankApi";
import {
  getWalletBalance,
  selectWallet,
  setWalletDetails
} from "../slice/wallet";
import { AppDispatch } from "../store";
import { getExchangeRate as getRate, sendTxRequest } from "../utils/bitmamaLib";
import { transferToken, getBalance } from "../utils/celo";
import { localStorageKey, requestIdKey } from "../utils/valoraLib";
import { CheckCircleIcon } from '@chakra-ui/icons'



type FiatType = "ng" | "gh";
type TransferType = "bank" | "mobileMoney";
type TokenType = "celo" | "cusd" | "ceur";

function Swap(props: RouterProps & { path: string }) {
  const [fiat, setFiat] = useState<FiatType>();
  const [token, setToken] = useState<TokenType>();
  const [sendValue, setSendValue] = useState<string>();
  const [receiveValue, setReceiveValue] = useState<string>();
  const [isCompletedProcess, setIsCompletedProcess] = useState(false);
  const [showField, setShowField] = useState({
    unit: true, amount: true
  });
  const [providedData, setProvidedData] = useState({
    email: "",
    phone: "",
    address: "",
    balance: 0
  });

  const [transferMethod, setTransferMethod] = useState<TransferType>();
  const [checkingRate, setCheckingRate] = useState<boolean>(false);
  const [approvingState, setApprovingState] = useState("");
  const [currentTab, setCurrentTab] = useState<"" | "newTab" | "redirectedTab">("");

  const [bankCode, setBankCode] = useState<string | undefined>();
  const [accountNumber, setAccountNumber] = useState<
    string | undefined
  >();

  const [skipBankListLoad, setSkipBankListLoad] = useState(true);

  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const { connected, balance, balanceStatus } = useSelector(selectWallet);

  interface GetExchangeRateUpdates {
    _fiat: FiatType;
    _token: TokenType;
    _send: number;
    _receive: number;
  }

  const {
    data,
    isLoading,
    error: bankListError,
  } = useGetBanksByCountryQuery(fiat ?? "", {
    skip: skipBankListLoad || currentTab !== "newTab",
  });

  const [
    resolveAccount,
    { data: bankDetail, isLoading: fetchingDetail, error: bankDetailError },
  ] = useResolveAccountMutation();

  const isApprovable = () => {
    if (
      (connected || true) &&
      _balance &&
      Number(sendValue) <= _balance &&
      accountNumber?.length &&
      fiat &&
      token
    )
      return true;
    return false;
  };

  const submitTransaction = async () => {
    try {
      setIsCompletedProcess(false);
    // console.log(
    //   "BUTTON PRESSED:::",
    //   accountNumber,
    //   token,
    //   fiat,
    //   sendValue,
    //   receiveValue,
    //   transferMethod,
    //   bankCode
    // );
    if(isApprovable()) {
      setApprovingState("processing")
      const trans = await transferToken(
        token,
        sendValue,
        "0xb7b18ff7375e9067ab72b00749b0d5868f043df9"
      );
      if(!trans) throw new Error("Unable to complete transaction")
      if(!trans.hash) throw new Error("Unable to complete transaction")
      setApprovingState("completed");
      const txPayload = {
        sourceToken: token,
        destinationFiat: fiat === "ng" ? "ngn" : "ghs",
        tokenAmount: Number(sendValue),
        transferMethod: transferMethod === "bank" ? "bank-transfer" : "mobile-money",
        email: providedData.email || "",
        phoneNumber: providedData.phone || "",
        fiatAmount: Number(receiveValue),
        sourceAddress: providedData?.address,
        transactionHash: trans?.hash,
        destinationAddress: trans.destinationAddress,
        paymentDetails: {
          bankCode: bankCode,
          bankName: String(((data.filter((b) => b.code === bankCode) || [{name: ""}])[0]).name),
          accountNumber: accountNumber,
          accountName: bankDetail?.account_name ?? ""
        },
      }
      await sendTxRequest(txPayload);
      setIsCompletedProcess(true);
      return trans?.hash;
    } else {
      toast({
          title: "Oops!! Something isn't right",
          description: "Ensure you filled all the inputs correctly and that you have sufficient balance in your account",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
    }
    } catch(err) {
      console.log({err})
        toast({
          title: "Oops!! Something went wrong",
          description: String(err),
          status: "error",
          duration: 3000,
          isClosable: true,
        });

    }
  };

  const handleTabState = async() => {
    if(!currentTab) {
      const type = new URLSearchParams(props?.location?.search).get("type");
      const status = new URLSearchParams(props?.location?.search).get("status");
      const requestId = new URLSearchParams(props?.location?.search).get("requestId");
      
      const unit = new URLSearchParams(props?.location?.search).get("unit");
      const amount = new URLSearchParams(props?.location?.search).get("amount");
      const address = new URLSearchParams(props?.location?.search).get("address") || "";
      const email = new URLSearchParams(props?.location?.search).get("email") || "";
      const phone = new URLSearchParams(props?.location?.search).get("phone") || "";


      if(type && status && requestId && String(requestId).includes("signTransaction")) {
        setCurrentTab("redirectedTab");
        const value = await localStorage.getItem(requestIdKey);
        if(value && (requestId === value)) {
          await localStorage.setItem(localStorageKey, window.location.href)
          setTimeout(function() {
            window.history.go(-1);
            // window.history.back();
          }, 3000);
        }
      } else {
        let balance = 0;
        const acceptableUnit = ["celo", "ceur", "cusd"];
        const coin = unit?.trim().toLowerCase();
        if(address && unit && coin && acceptableUnit.includes(coin)) {
          balance = await getBalance(address, coin);
          if(isNaN(balance)) balance = 0;
        }
        setProvidedData({email, phone, address, balance: Number(balance ?? 0)});
        if(coin && acceptableUnit.includes(coin) && !isNaN(amount)) {
          setShowField({
            unit: false,
            amount: false,
          });
          handleToken({target: {value: coin}})
          handleSendValue({ target: { value: String(amount) } });
        }
        setCurrentTab("newTab")
      }
    }
  }

  useEffect(() => {
    return () => {
      !isCompletedProcess && window.confirm("Are you sure you want to discard your changes?")
    }
  }, [isCompletedProcess])

  useEffect(() => {
    handleTabState()
    // eslint-disable-next-line
  }, [props?.location?.search, currentTab])

  useEffect(() => {
    if(currentTab === "newTab") {
      if (bankDetailError || bankListError) {
        toast({
          title: "Oops!! something went wrong",
          description: ((bankDetailError ?? bankListError) as any)?.data.message,
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    }
  }, [currentTab, bankListError, bankDetailError, toast]);

  const phone = new URLSearchParams(props?.location?.search).get("phone");
  const address = new URLSearchParams(props?.location?.search).get("address");

  useEffect(() => {
    if (phone && address) {
      dispatch(
        setWalletDetails({
          address,
          phoneNumber: phone,
        })
      );
    }
  }, [phone, address, dispatch]);

  useEffect(() => {
    if(currentTab === "newTab") {
      if (balance) {
        handleSendValue({ target: { value: String(balance) } });
      }
    }
    // eslint-disable-next-line
  }, [currentTab, balance]);

  const getExchangeRate = async (
    e: any,
    // custom fix for delayed react state update issues.
    { _fiat, _token, _send, _receive }: Partial<GetExchangeRateUpdates>
  ) => {
    const cryptoMap = { cusd: "usd", ceur: "eur", celo: "celo" };
    const fiatMap = { gh: "ghs", ng: "ngn" };

    const source = cryptoMap[(_token ?? token) as TokenType];
    const destination = fiatMap[(_fiat ?? fiat) as FiatType];

    if (!source || !destination) return;

    const inputSource = e.target.name;
    // console.log(
    //   "INPUT SOURCE",
    //   inputSource,
    //   source,
    //   destination,
    //   _send ?? sendValue,
    //   _receive ?? receiveValue
    // );

    if (_send || sendValue || _receive || receiveValue) setCheckingRate(true);

    const {
      data: { message },
    } = await getRate(source, destination);
    const rate = (message as IExchangeRate).sell;

    const receiveAmount = Number(
      rate * ((_send ?? sendValue) as number)
    ).toFixed(4);

    const sendAmount = Number(
      ((_receive ?? receiveAmount) as number) / rate
    ).toFixed(4);

    setCheckingRate(false);

    if (
      inputSource === "receive" ||
      inputSource === "crypto" ||
      inputSource === "send"
    )
      receiveAmount && setReceiveValue(receiveAmount);
    if (inputSource === "fiat") setSendValue(sendAmount);
  };

  // eslint-disable-next-line
  const debouncedResolveAccount = useCallback(
    debounce(
      (accountNumber, bankCode) =>
        resolveAccount({
          accountNumber,
          bankCode,
        }),
      1500
    ),
    [resolveAccount]
  );

  // console.log("BANK DATA", bankDetail);

  const handleFiat = (e: any) => {
    setFiat(e.target.value);
    debounce(
      async () => await getExchangeRate(e, { _fiat: e.target.value }),
      500
    )();
  };

  const handleToken = (e: any) => {
    setToken(e.target.value);
    connected && dispatch(getWalletBalance(e.target.value));
    debounce(
      async () => await getExchangeRate(e, { _token: e.target.value }),
      500
    )();
  };

  const handleTransferMethod = (e: any) => {
    setTransferMethod(e.target.value);
    if (fiat && e.target.value === "bank") setSkipBankListLoad(false);
  };

  const handleSendValue = (e: any) => {
    setSendValue(e.target.value);
    // debouncedGetExchangeRate(e, { _send: e.target.value });
    debounce(
      async () => await getExchangeRate(e, { _send: e.target.value }),
      1500
    )();
  };

  const handleReceiveValue = (e: any) => {
    setReceiveValue(e.target.value);
    // debouncedGetExchangeRate(e, { _receive: e.target.value });
    debounce(
      async () => await getExchangeRate(e, { _receive: e.target.value }),
      2000
    )();
  };

  const handleBankCode = (e: any) => {
    setBankCode(e.target.value);
  };

  const handleAccountNumber = (e: any) => {
    setAccountNumber(e.target.value);
    debouncedResolveAccount(e.target.value, bankCode as string);
  };

  if(currentTab !== "newTab") {
    return (
      <>
      <Box p="50px 0" minH="100vh">
        <Box bg="rgba(249,250,251,1)" h="100%">
          <Container maxW={["container.xl", "xl"]} h="100%">
            <VStack p={["40px 0", "40px"]}>
              <VStack>
                <Image
                  w="121px"
                  h="48px"
                  src="https://prod-doc.fra1.cdn.digitaloceanspaces.com/btm-assets/logo.png"
                />
                
                <Heading
                  textAlign="center"
                  fontSize="sm"
                  m="140px 0 !important"
                >
                  {currentTab === "redirectedTab" ? <Box m="0 0 1rem 0 !important">
                    Processing &nbsp;&nbsp;
                  </Box> : null }
                  <CircularProgress
                    size="24px"
                    isIndeterminate
                    color="green.300"
                  />
                  
                </Heading>
              </VStack>
            </VStack>
          </Container>
        </Box>
      </Box>
    </>
    )
  }

  const _balance = balance || providedData?.balance;

  return (
    <>
      <Box p="50px 0" minH="100vh">
        <Box bg="rgba(249,250,251,1)" h="100%">
          <Container maxW={["container.xl", "xl"]} h="100%">
            <VStack p={["40px 0", "40px"]}>
              <VStack>
                <Image
                  w="121px"
                  h="48px"
                  src="https://prod-doc.fra1.cdn.digitaloceanspaces.com/btm-assets/logo.png"
                />
                <Heading
                  textAlign="center"
                  fontSize="2xl"
                  m="20px 0 !important"
                >
                  Withdraw cEUR/cUSD
                </Heading>
              </VStack>

              <Box
                as="form"
                boxShadow="base"
                p={["1rem 1.5rem", "2rem 2.5rem"]}
                w="100%"
                bg="white"
                borderRadius=".5rem"
              >
                {connected && approvingState !== "completed" && (
                  <Badge mb="20px" variant="solid" colorScheme="green">
                    CONNECTED
                  </Badge>
                )}
                {(approvingState !== "completed") ? 
                  <>
                  <FormControl>
                    <Box as="label">You Send</Box>
                    <HStack mt=".25rem">
                      <Select
                        name="send"
                        fontSize=".85rem"
                        value={token ?? ""}
                        onChange={handleToken}
                        disabled={!showField.unit || approvingState === "processing"}
                        isReadOnly={!showField.unit || approvingState === "processing"}
                        placeholder="Choose Token"
                      >
                        <option value="celo">CELO</option>
                        <option value="cusd">cUSD</option>
                        <option value="ceur">cEUR</option>
                      </Select>

                      <InputGroup>
                        {_balance && showField.amount && (
                          <InputLeftElement
                            pl="8px"
                            children={
                              <Button
                              disabled={approvingState === "processing"}
                                onClick={() =>
                                  handleSendValue({
                                    target: { value: String(_balance) },
                                  })
                                }
                                size="xs"
                              >
                                Max
                              </Button>
                            }
                          />
                        )}
                        <Input
                          pl={_balance && showField.amount ? "44px" : "16px"}
                          name="crypto"
                          value={sendValue ?? ""}
                          onChange={handleSendValue}
                          colorScheme="green"
                          type="number"
                          disabled={!token || approvingState === "processing"}
                          isReadOnly={!showField.amount || approvingState === "processing"}
                        />
                        {checkingRate && !showField.amount && (
                          <InputRightElement
                            children={
                              <CircularProgress
                                size="16px"
                                isIndeterminate
                                color="green.300"
                              />
                            }
                          />
                        )}
                      </InputGroup>
                    </HStack>
                    {(_balance || connected) ? <HStack mt="4px">
                      {balanceStatus === "loading" && (
                        <CircularProgress
                          size="12px"
                          isIndeterminate
                          color="green.300"
                        />
                      )}
                      <Box as="span" fontSize="12px" fontWeight="400">
                        Balance:{" "}
                        <strong>
                          {_balance} {token?.toUpperCase()}
                        </strong>
                      </Box>
                    </HStack> : null}
                  </FormControl> 

                  {approvingState !== "completed" ? 
                    <FormControl mt="20px">
                      <Box as="label">You Receive</Box>
                      <HStack mt=".25rem">
                        <Select
                          name="receive"
                          fontSize=".85rem"
                          value={fiat || ""}
                          disabled={approvingState === "processing"}
                          isReadOnly={approvingState === "processing"}
                          onChange={handleFiat}
                          placeholder="Choose Fiat"
                        >
                          <option value="ng">Nigerian Naira (NGN)</option>
                          <option value="gh">Ghanian Cedis (GHC)</option>
                        </Select>

                        <InputGroup>
                          <Input
                            name="fiat"
                            value={receiveValue ?? ""}
                            disabled={approvingState === "processing"}
                            isReadOnly={!showField.amount}
                            onChange={handleReceiveValue}
                            type="number"
                            // as={Input}
                            // precision={4}
                          />
                          {checkingRate && (
                            <InputRightElement
                              children={
                                <CircularProgress
                                  size="16px"
                                  isIndeterminate
                                  color="green.300"
                                />
                              }
                            />
                          )}
                        </InputGroup>
                      </HStack>
                    </FormControl> : 
                    <>
                    </>
                    }

                  {fiat && (
                    <FormControl mt="20px">
                      <Box as="label">Transfer Method</Box>
                      <Select
                        mt=".25rem"
                        fontSize=".85rem"
                        value={transferMethod || ""}
                        onChange={handleTransferMethod}
                        placeholder="Choose Transfer Method"
                        disabled={approvingState === "processing"}
                        isReadOnly={approvingState === "processing"}
                      >
                        <option value="bank">Bank Transfer</option>
                        {fiat === "gh" && (
                          <option value="mobileMoney">Mobile Money</option>
                        )}
                      </Select>
                    </FormControl>
                  )}

                  {transferMethod === "bank" && fiat && (
                    <FormControl mt="20px">
                      <HStack>
                        <Box as="label">Payment Details</Box>
                        {isLoading && (
                          <CircularProgress
                            size="16px"
                            isIndeterminate
                            color="green.300"
                          />
                        )}
                      </HStack>
                      <VStack>
                        <Select
                          mt=".25rem"
                          fontSize=".85rem"
                          value={bankCode || ""}
                          onChange={handleBankCode}
                          disabled={approvingState === "processing"}
                          isReadOnly={approvingState === "processing"}
                          placeholder="Choose Bank"
                          {...(data && data[0] && {defaultValue: data[0].code})}
                        >
                          {data?.map(({ code, name }, index) => (
                            <option value={code} key={String(code) + index}>{name}</option>
                          ))}
                        </Select>
                        <InputGroup>
                          <Input
                            disabled={!bankCode || approvingState === "processing"}
                            isReadOnly={approvingState === "processing"}
                            type="number"
                            placeholder="Account Number"
                            value={accountNumber || ""}
                            onChange={handleAccountNumber}
                          />
                          <InputRightElement
                            children={
                              fetchingDetail ? (
                                <CircularProgress
                                  size="16px"
                                  isIndeterminate
                                  color="green.300"
                                />
                              ) : (
                                <IconButton
                                  size="xs"
                                  as={Button}
                                  aria-label="refetch details"
                                  icon={<RepeatIcon />}
                                  onClick={() =>
                                    approvingState !== "processing" && accountNumber && resolveAccount({
                                      accountNumber: accountNumber as string,
                                      bankCode: bankCode as string,
                                    })
                                  }
                                />
                              )
                            }
                          />
                        </InputGroup>
                        <InputGroup>
                          <Input
                            disabled
                            type="text"
                            placeholder="Account Name"
                            defaultValue={bankDetail?.account_name ?? ""}
                          />
                        </InputGroup>
                      </VStack>
                    </FormControl>
                  )}

                  <Button
                    colorScheme="green"
                    w="100%"
                    mt="30px"
                    fontSize="sm"
                    fontWeight="400"
                    onClick={async () => {
                      await submitTransaction();
                    }}
                    // disabled={!isApprovable()}
                    disabled={!isApprovable() || approvingState === "processing" || approvingState === "completed"}
                  >
                    {approvingState === "processing" ? 
                      <CircularProgress
                        size="16px"
                        isIndeterminate
                        color="green.300"
                      /> : approvingState === "completed" ? "Successful" : "Approve Spend"}
                  </Button>
                  </> : 
                  <>
                    <Flex color="white" justify="center">
                      <Center w="100px">
                        <HStack mt="1.5rem" mb="1.5rem">
                          <CheckCircleIcon w={16} h={16} color="green.500"/>
                        </HStack>
                    </Center>
                    </Flex>
                    <Flex color="white" justify="center">
                      <Center w="100px">
                        <HStack mt="1.5rem" mb="1.5rem">
                          <Box as="span" fontSize="20px" fontWeight="bold" color="green">
                            SUCCESSFUL
                          </Box>
                        </HStack>
                      </Center>
                    </Flex>
                    <Flex color="white" justify="center">
                      <Center w="100px">
                        <HStack mt="1.5rem" mb="1.5rem">
                          <Box as="button" onClick={
                            () => {
                              window.location='/'
                            }
                          } fontSize="12px" fontWeight="200" color="grey">
                            Back Home
                          </Box>
                        </HStack>
                    </Center>
                    </Flex>
                  </>
              }
              </Box>
            </VStack>
          </Container>
        </Box>
      </Box>
    </>
  );
}

export default Swap;
