import { ButtonGroup } from "@chakra-ui/button";
import { useDisclosure } from "@chakra-ui/hooks";
import { CheckCircleIcon, RepeatIcon } from "@chakra-ui/icons";
import { Portal } from "@chakra-ui/portal";
import {
  Badge,
  Box,
  Center,
  CircularProgress,
  Container,
  Flex,
  FormControl, Heading,
  HStack,
  IconButton,
  Image,
  InputGroup, InputLeftElement,
  InputRightElement,
  Popover,
  PopoverArrow,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  useToast,
  VStack
} from "@chakra-ui/react";
import { RouterProps, useNavigate } from "@reach/router";
import { isNaN } from "lodash";
import debounce from "lodash/debounce";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, Select } from "../components";
import { IExchangeRate } from "../interfaces";
import { useGetBanksByCountryQuery, useResolveAccountMutation } from "../services/bankApi";
import { getWalletBalance, selectWallet, setWalletDetails } from "../slice/wallet";
import { AppDispatch } from "../store";
import { getExchangeRate as getRate, sendTxRequest } from "../utils/bitmamaLib";
import { getBalance, transferToken } from "../utils/celo";
import { localStorageKey, requestIdKey } from "../utils/valoraLib";

const isValidName = (name: string) => {
  const re = /^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/;
  return name.length >= 2 && re.test(name) && name.length <= 30;
}

const isValidEmail = (email: string) => {
  // eslint-disable-next-line
  const re = /^\S+@\S+[\.][0-9a-z]+$/;
  return re.test(email);
}

type FiatType = "ng" | "gh";
type TransferType = "bank" | "mobileMoney";
type TokenType = "celo" | "cusd" | "ceur";

type ProvidedData = {
  email: string;
  phone: string;
  address: string;
  balance: number;
};

const handler = {
  get: (target, property, receiver) => {
    if (property in target) {
      return target[property]
    }
    return 10
  }
}

function minimumProxy(obj: Partial<Record<string,number>>) {
    return new Proxy(obj, handler);
}

const minimumToken = minimumProxy({celo: 5});


function Swap(props: RouterProps & { path: string }) {
  const { onOpen: onPopOverOpen, onClose: onPopOverClose, isOpen: isContactPopOverOpen } = useDisclosure();
  const firstFieldRef = useRef(null);

  const navigate = useNavigate();
  const [fiat, setFiat] = useState<FiatType>();
  const [token, setToken] = useState<TokenType>();
  const [sendValue, setSendValue] = useState<string>();
  const [receiveValue, setReceiveValue] = useState<string>();
  const [isCompletedProcess, setIsCompletedProcess] = useState(false);
  const [showField, setShowField] = useState({
    unit: true,
    amount: true,
  });
  const [providedData, setProvidedData] = useState<ProvidedData>({
    email: "",
    phone: "",
    address: "",
    balance: 0,
  });

  const [transferMethod, setTransferMethod] = useState<TransferType>();
  const [checkingRate, setCheckingRate] = useState<boolean>(false);
  const [approvingState, setApprovingState] = useState("");
  const [fiatUnitRate, setFiatUnitRate] = useState(0);
  const [currentTab, setCurrentTab] = useState<"" | "newTab" | "redirectedTab">("");
  const [accountName, setAccountName] = useState("");

  const [bankCode, setBankCode] = useState<string | undefined>();
  const [accountNumber, setAccountNumber] = useState<string | undefined>();

  const [skipBankListLoad, setSkipBankListLoad] = useState(true);

  const toast = useToast();
  const closeRef = useRef<any>();
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

  const _balance = balance || providedData?.balance;

  const [resolveAccount, { data: bankDetail, isLoading: fetchingDetail, error: bankDetailError }] = useResolveAccountMutation();

  const isProcessable = useMemo(() => {
    if ((connected || true || _balance) && providedData?.email && isValidEmail(providedData?.email) && sendValue && accountNumber?.length && fiat && token && ((fiat === "ng" && bankDetail?.account_name) || (fiat === "gh" && accountName && isValidName(accountName)) )) return true;
    return false;
  }, [connected, _balance, sendValue, accountNumber?.length, fiat, token, bankDetail?.account_name, accountName, providedData?.email]);

  const submitTransaction = async () => {
    try {
      setIsCompletedProcess(false);
      if (isProcessable) {
        setApprovingState("processing");
        const trans = await transferToken(token || "", Number(sendValue) || 0, providedData.address || "");
        if (!trans) throw new Error("Unable to complete transaction");
        if (!trans.hash) throw new Error("Unable to complete transaction");
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
            bankName: String(((data || [{ code: "", name: "" }]).filter((b) => b.code === bankCode) || [{ name: "" }])[0].name),
            accountNumber: accountNumber,
            accountName: fiat === "ng" ? (bankDetail?.account_name ?? "") : (accountName ?? "") ,
          },
        };
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
    } catch (error: any) {
      setApprovingState("");
      let err = String(error);
      if (error?.isAxiosError) {
        err = error?.response?.data?.message || "Something went wrong";
      }
      toast({
        title: "Oops!! Something went wrong",
        description: String(err),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleTabState = async () => {
    if (!currentTab) {
      const type = new URLSearchParams(props?.location?.search).get("type");
      const status = new URLSearchParams(props?.location?.search).get("status");
      const requestId = new URLSearchParams(props?.location?.search).get("requestId");

      const unit = new URLSearchParams(props?.location?.search).get("unit");
      const amount = new URLSearchParams(props?.location?.search).get("amount");
      const address = new URLSearchParams(props?.location?.search).get("address") || "";
      const email = new URLSearchParams(props?.location?.search).get("email") || "";
      const phone = new URLSearchParams(props?.location?.search).get("phone") || "";

      if (type && status && requestId && String(requestId).includes("signTransaction")) {
        setCurrentTab("redirectedTab");
        const value = await localStorage.getItem(requestIdKey);
        if (value && requestId === value) {
          await localStorage.setItem(localStorageKey, window.location.href);
          setTimeout(function () {
            window.history.go(-1);
            // window.history.back();
          }, 3000);
        }
      } else {
        let balance = 0;
        const acceptableUnit = ["celo", "ceur", "cusd"];
        const coin = unit?.trim().toLowerCase();
        if (address && unit && coin && acceptableUnit.includes(coin)) {
          try {
            balance = await getBalance(address, coin);
            if (isNaN(balance)) balance = 0;
          } catch (err) {
            toast({
              title: "Oops!! Something went wrong",
              description: String(err),
              status: "error",
              duration: 10000,
              isClosable: true,
            });
          }
        }
        setProvidedData({
          email,
          phone,
          address,
          balance: Number(balance ?? 0),
        });
        if (coin && acceptableUnit.includes(coin) && !isNaN(amount)) {
          setShowField({
            unit: false,
            amount: amount ? false : true,
          });
          handleToken({ target: { value: coin } });
          handleSendValue({ target: { value: String(amount) } });
        }
        setCurrentTab("newTab");
      }
    }
  };

  useEffect(() => {
    return () => {
      if (closeRef.current) clearTimeout(closeRef.current);
      !isCompletedProcess && window.confirm("Are you sure you want to discard your changes?");
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    handleTabState();
    // eslint-disable-next-line
  }, [props?.location?.search, currentTab]);

  useEffect(() => {
    if (currentTab === "newTab") {
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
    if (currentTab === "newTab") {
      if (balance && !sendValue && showField.amount) {
        // handleSendValue({ target: { value: String(balance) } });
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

    if (_send || sendValue || _receive || receiveValue) setCheckingRate(true);

    const {
      data: { message },
    } = await getRate(source, destination);
    const rate = (message as IExchangeRate).sell;
    
    const receiveAmount = Number(rate * ((_send ?? sendValue) as number)).toFixed(4);

    setFiatUnitRate(Number(Number(rate).toFixed(4)));

    const sendAmount = Number(((_receive ?? receiveAmount) as number) / rate).toFixed(4);

    setCheckingRate(false);

    if (inputSource === "receive" || inputSource === "crypto" || inputSource === "send") receiveAmount && setReceiveValue(receiveAmount);
    if (inputSource === "fiat") setSendValue(sendAmount);
  };

  const currentRate = fiatUnitRate;

  type Debouncer = Partial<Record<string, ReturnType<typeof setTimeout>>>; 
  type Debouncable = string; 
  const debouncer = useRef<Debouncer>({});

  const redebounce = useCallback((cb, functionName:Debouncable, delay:number) => {
    let timeout = debouncer.current[functionName];
    return function () {
      if(timeout)  {
        clearTimeout(timeout);
        debouncer.current[functionName] = undefined;
      }
      debouncer.current[functionName] = setTimeout(cb, delay);
    };
    // eslint-disable-next-line
  }, [])

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

  const handleFiat = (e: any) => {
    setFiat(e.target.value);
    debounce(async () => await getExchangeRate(e, { _fiat: e.target.value }), 500)();
  };

  const handleToken = (e: any) => {
    setToken(e.target.value);
    connected && dispatch(getWalletBalance(e.target.value));
    debounce(async () => await getExchangeRate(e, { _token: e.target.value }), 500)();
  };

  const handleTransferMethod = (e: any) => {
    setTransferMethod(e.target.value);
    if (fiat && e.target.value === "bank") setSkipBankListLoad(false);
  };

  const handleSendValue = (e: any) => {
    setSendValue(e.target.value);
    redebounce(async () => await getExchangeRate(e, { _send: e.target.value }), "handleSendValue", 1500)();
  };

  // cleanups memory leaks
  useEffect(() => {
    const dc = debouncer.current
    
    return () => {
      const debouncing = Object.keys(dc);
      debouncing.forEach((d) => {
        const timeout = dc[d];
        if(timeout)  {
          clearTimeout(timeout);
          dc[d] = undefined;
        }
      })
    }
  }, [])

  /* eslint-disable */
  useEffect(() => {
    if(!providedData?.address) {
      redebounce(() => {
          if(token) {
            const addr = window.prompt(`Enter your ${token.toUpperCase()} address: `);
            if(addr) {
              if(debouncer.current["checkAddress"]) {
                clearTimeout(debouncer.current["checkAddress"]);
                debouncer.current["checkAddress"] = undefined;
              }
              setProvidedData({...providedData, address: addr})
              let url = new URL(window.location.href);
              let params = new URLSearchParams(url.search.slice(1));
              if(!params.has("address")) params.append('address', addr);
              if(!params.has("unit")) params.append('unit', token);
              if(!params.has("amount") && sendValue) params.append('amount', sendValue);
              location.replace(`/?${params}`);
            } else {
            toast({
              title: "Oops!! Url format error",
              description: `Address is missing in query`,
              status: "error",
              duration: showField?.unit ? 2000 : 20000,
              isClosable: true,
            });
          }
        }
      }, "checkAddress", 4000)();
    }
    return () => {
      if(debouncer.current["checkAddress"]) {
        clearTimeout(debouncer.current["checkAddress"]);
        debouncer.current["checkAddress"] = undefined;
      }
    }
  }, [providedData?.address, showField.unit, token, sendValue])
  /* eslint-enable */


  const handleReceiveValue = (e: any) => {
    setReceiveValue(e.target.value);
    redebounce(async () => await getExchangeRate(e, { _receive: e.target.value }), "handleReceiveValue", 2000)();
  };

  const handleBankCode = (e: any) => {
    setBankCode(e.target.value);
  };

  const handleAccountNumber = (e: any) => {
    setAccountNumber(e.target.value);
    if(fiat === "ng") debouncedResolveAccount(e.target.value, bankCode as string);
  };

  const handleAccountName = (e: any) => {
    redebounce(async () => {
      if(!isValidName(e.target.value)) {
        toast({
          title: "Oops!! Invalid Input",
          description: "Account name is invalid",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }, "validateAccountName", 3000)();
    setAccountName(e.target.value);
  };

  if (currentTab !== "newTab") {
    return (
      <>
        <Box p="50px 0" minH="100vh">
          <Box bg="rgba(249,250,251,1)" h="100%">
            <Container maxW={["container.xl", "xl"]} h="100%">
              <VStack p={["40px 0", "40px"]}>
                <VStack>
                  <Image w="121px" h="48px" src="https://prod-doc.fra1.cdn.digitaloceanspaces.com/btm-assets/logo.png" />

                  <Heading textAlign="center" fontSize="sm" m="140px 0 !important">
                    {currentTab === "redirectedTab" ? <Box m="0 0 1rem 0 !important">Processing &nbsp;&nbsp;</Box> : null}
                    <CircularProgress size="24px" isIndeterminate color="green.300" />
                  </Heading>
                </VStack>
              </VStack>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  const isInvalidAmount = sendValue && token && Number(sendValue) < minimumToken[token];

  return (
    <>
      <Box p="50px 0" minH="100vh">
        <Box bg="rgba(249,250,251,1)" h="100%">
          <Container maxW={["container.xl", "xl"]} h="100%">
            <VStack p={["40px 0", "40px"]}>
              <VStack>
                <Image w="121px" h="48px" src="https://prod-doc.fra1.cdn.digitaloceanspaces.com/btm-assets/logo.png" />
                <Heading textAlign="center" fontSize="2xl" m="20px 0 !important">
                  Withdraw CELO/cEUR/cUSD
                </Heading>
              </VStack>

              <Box as="form" boxShadow="base" p={["1rem 1.5rem", "2rem 2.5rem"]} w="100%" bg="white" borderRadius=".5rem">
                {connected && approvingState !== "completed" && (
                  <Badge mb="20px" variant="solid" colorScheme="green">
                    CONNECTED
                  </Badge>
                )}
                {approvingState !== "completed" ? (
                  <>
                    <FormControl>
                      <Box as="label">You Send</Box>
                      <HStack mt=".25rem">
                        <Select
                          name="send"
                          fontSize=".85rem"
                          value={token ?? ""}
                          onChange={(e:any) => {
                            if(!showField.unit || approvingState === "processing") return
                            handleToken(e)
                            }}
                          // disabled={!showField.unit || approvingState === "processing"}
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
                            // isInvalid={Boolean(sendValue && Number(sendValue) < 10)}
                            isInvalid={isInvalidAmount ? true : false}
                            disabled={!token || approvingState === "processing"}
                            isReadOnly={!showField.amount || approvingState === "processing"}
                          />
                          {checkingRate && !showField.amount && (
                            <InputRightElement children={<CircularProgress size="16px" isIndeterminate color="green.300" />} />
                          )}
                        </InputGroup>
                      </HStack>
                      {_balance || connected ? (
                        <HStack mt="4px">
                          <HStack width={"50%"}>
                            {balanceStatus === "loading" && <CircularProgress size="12px" isIndeterminate color="green.300" />}
                            <Box as="span" fontSize="10px" fontWeight="400" flexBasis={{ base: "50%" }} >
                              Balance:{" "}
                              <strong>
                                {Number(Number(_balance).toFixed(4))} {token?.toUpperCase()}
                              </strong>
                            </Box>
                            </HStack>
                            {isInvalidAmount && token ? <HStack>
                              <Box as="span" fontSize="12px" fontWeight="400" color="red.200">
                                <p>{`Minimum amount is ${minimumToken[token]} ${String(token).toUpperCase()}`}</p>
                              </Box>
                            </HStack> : null}

                        </HStack>
                      ) : null}
                    </FormControl>

                    {approvingState !== "completed" ? (
                      <FormControl mt="20px">
                        <Box as="label">You Receive</Box>
                        <HStack mt=".25rem">
                          <Select
                            name="receive"
                            fontSize=".85rem"
                            value={fiat || ""}
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
                            />
                            {checkingRate && <InputRightElement children={<CircularProgress size="16px" isIndeterminate color="green.300" />} />}
                          </InputGroup>
                        </HStack>
                        {currentRate && fiat ? (
                        <HStack mt="4px">
                          {balanceStatus === "loading" && <CircularProgress size="12px" isIndeterminate color="green.300" />}
                          <Box as="span" fontSize="10px" fontWeight="400">
                            Current Rate:{" "}
                            <strong>
                              1 {String(token).toUpperCase()} / {Number(currentRate).toLocaleString()} {fiat?.toUpperCase()}
                            </strong>
                          </Box>
                        </HStack>
                      ) : null}
                      </FormControl>
                    ) : (
                      <></>
                    )}

                    <FormControl mt="20px">
                      <HStack>
                        <Box as="label">Email Address</Box>
                      </HStack>
                      <VStack>
                        <InputGroup>
                          <Input
                            disabled={approvingState === "processing"}
                            isReadOnly={approvingState === "processing"}
                            type="email"
                            isInvalid={providedData?.email && !isValidEmail(providedData?.email) ? true : false}
                            value={providedData?.email || ""}
                            onChange={(e: any) => {
                              redebounce(async () => {
                                if(!isValidEmail(e.target.value)) {
                                  toast({
                                    title: "Oops!! Invalid Input",
                                    description: "Email is invalid",
                                    status: "error",
                                    duration: 3000,
                                    isClosable: true,
                                  });
                                }
                              }, "validateEmail", 3000)();
                              setProvidedData({ ...providedData, email: e?.target.value });
                            }}
                          />
                        </InputGroup>
                      </VStack>
                    </FormControl>

                    {fiat && (
                      <FormControl mt="20px">
                        <Box as="label">Transfer Method</Box>
                        <Select
                          mt=".25rem"
                          fontSize=".85rem"
                          value={transferMethod || ""}
                          onChange={handleTransferMethod}
                          placeholder="Choose Transfer Method"
                          isReadOnly={approvingState === "processing"}
                        >
                          <option value="bank">{fiat === "gh" ? "Bank/Mobile Money" : "Bank Transfer"}</option>
                          {/* {fiat === "gh" && <option value="mobileMoney">Mobile Money</option>} */}
                        </Select>
                      </FormControl>
                    )}

                    {transferMethod === "bank" && fiat && (
                      <FormControl mt="20px">
                        <HStack>
                          <Box as="label">Payment Details</Box>
                          {isLoading && <CircularProgress size="16px" isIndeterminate color="green.300" />}
                        </HStack>
                        <VStack>
                          <Select
                            mt=".25rem"
                            fontSize=".85rem"
                            value={bankCode || ""}
                            onChange={handleBankCode}
                            isReadOnly={approvingState === "processing"}
                            placeholder="Choose Bank"
                            {...(data && data[0] && { defaultValue: data[0].code })}
                          >
                            {data?.map(({ code, name }, index) => (
                              <option value={code} key={String(code) + index}>
                                {name}
                              </option>
                            ))}
                          </Select>
                          {bankCode ?
                            <>
                              <InputGroup>
                                <Input
                                  disabled={!bankCode || approvingState === "processing"}
                                  isReadOnly={approvingState === "processing"}
                                  type="number"
                                  placeholder="Account Number"
                                  value={accountNumber || ""}
                                  onChange={handleAccountNumber}
                                />
                                {fiat === "ng" ? <InputRightElement
                                  children={
                                    fetchingDetail ? (
                                      <CircularProgress size="16px" isIndeterminate color="green.300" />
                                    ) : (
                                      <IconButton
                                        size="xs"
                                        as={Button}
                                        aria-label="refetch details"
                                        icon={<RepeatIcon />}
                                        onClick={() =>
                                          approvingState !== "processing" &&
                                          accountNumber &&
                                          resolveAccount({
                                            accountNumber: accountNumber as string,
                                            bankCode: bankCode as string,
                                          })
                                        }
                                      />
                                    )
                                  }
                                /> : null}
                              </InputGroup>
                              <InputGroup>
                                <Input disabled={fiat === "ng"} type="text" placeholder="Account Name" defaultValue={bankDetail?.account_name ?? ""} onChange={handleAccountName} />
                              </InputGroup>
                            </> : null}
                        </VStack>
                      </FormControl>
                    )}

                    {true || (providedData?.phone && providedData?.address) ? (
                      <Button
                        colorScheme="green"
                        w="100%"
                        mt="30px"
                        fontSize="sm"
                        fontWeight="400"
                        onClick={async () => {
                          await submitTransaction();
                        }}
                        disabled={!isProcessable || approvingState === "processing" || approvingState === "completed"}
                      >
                        {approvingState === "processing" ? (
                          <CircularProgress size="16px" isIndeterminate color="green.300" />
                        ) : approvingState === "completed" ? (
                          "Successful"
                        ) : (
                          "Approve Spend"
                        )}
                      </Button>
                    ) : (
                      <Popover
                        isOpen={isContactPopOverOpen}
                        initialFocusRef={firstFieldRef}
                        onOpen={onPopOverOpen}
                        onClose={onPopOverClose}
                        placement="top"
                        closeOnBlur={false}
                      >
                        <PopoverTrigger>
                          <Button colorScheme="green" w="100%" mt="30px" fontSize="sm" fontWeight="400" disabled={!isProcessable}>
                            Next
                          </Button>
                        </PopoverTrigger>
                        <Portal>
                          <PopoverContent p={5}>
                            <FocusLock returnFocus persistentFocus={false}>
                              <PopoverArrow />
                              <PopoverCloseButton />
                              <ContactForm
                                data={providedData}
                                token={token || ""}
                                firstFieldRef={firstFieldRef}
                                onCancel={onPopOverClose}
                                updateData={setProvidedData}
                              />
                            </FocusLock>
                          </PopoverContent>
                        </Portal>
                      </Popover>
                    )}
                  </>
                ) : (
                  <>
                    <Flex color="white" justify="center">
                      <Center w="100px">
                        <HStack mt="1.5rem" mb="1.5rem">
                          <CheckCircleIcon w={16} h={16} color="green.500" />
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
                          <Box
                            as="button"
                            onClick={() => {
                              navigate(`/`);
                              closeRef.current = setTimeout(() => window.close(), 1000);
                            }}
                            fontSize="12px"
                            fontWeight="200"
                            color="grey"
                          >
                            Back Home
                          </Box>
                        </HStack>
                      </Center>
                    </Flex>
                  </>
                )}
              </Box>
            </VStack>
          </Container>
        </Box>
      </Box>
    </>
  );
}

export default Swap;

interface IContactForm {
  data: ProvidedData;
  token: string;
  firstFieldRef: any;
  onCancel: any;
  updateData: (d: ProvidedData) => void;
}

const ContactForm: FC<IContactForm> = ({ token, firstFieldRef, data, updateData, onCancel }) => {
  const [providedData, setProvidedData] = useState<ProvidedData>(data);

  const updateProvidedData = (t: string, type: keyof ProvidedData) => {
    setProvidedData((pData: ProvidedData) => ({ ...pData, [type]: t }));
  };

  return (
    <>
      {!data?.address ? (
        <FormControl mt="20px">
          <Box as="label">{token?.toUpperCase()} Address</Box>
          <HStack mt=".25rem"></HStack>
          <Input {...{ ref: firstFieldRef }} value={providedData?.address ?? ""} onChange={(e: any) => updateProvidedData(e.target.value, "address")} />
        </FormControl>
      ) : null}

      {!data?.email ? (
        <FormControl mt="20px">
          <Box as="label">Email</Box>
          <HStack mt=".25rem"></HStack>
          <Input
            type="email"
            {...{ ref: !data.address ? firstFieldRef : null }}
            value={providedData?.email ?? ""}
            onChange={(e: any) => updateProvidedData(e.target.value, "email")}
          />
        </FormControl>
      ) : null}

      {!data?.phone ? (
        <FormControl mt="20px">
          <Box as="label">Phone Number</Box>
          <HStack mt=".25rem"></HStack>
          <Input
            type="tel"
            {...{ ref: !data.address && !data?.email ? firstFieldRef : null }}
            value={providedData?.phone ?? ""}
            onChange={(e: any) => updateProvidedData(e.target.value, "phone")}
          />
        </FormControl>
      ) : null}

      <ButtonGroup d="flex" justifyContent="flex-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button colorScheme="teal" onClick={() => updateData(providedData)}>
          Continue
        </Button>
      </ButtonGroup>
    </>
  );
};
