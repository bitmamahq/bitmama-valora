import { CheckCircleIcon, CopyIcon } from "@chakra-ui/icons";
import {
  Badge,
  Box,
  Center,
  CircularProgress,
  Container,
  Flex,
  FormControl,
  Heading,
  HStack, IconButton, Image,
  InputGroup,
  InputLeftElement,
  InputRightElement, Stack, Text, useClipboard, useDisclosure, useToast, VStack
} from "@chakra-ui/react";
import { RouterProps, useNavigate } from "@reach/router";
import { isNaN } from "lodash";
import debounce from "lodash/debounce";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, ConfirmationModal, Input, Select } from "../../components";
import { IExchangeRate } from "../../interfaces";
import { getWalletBalance, selectWallet, setWalletDetails } from "../../slice/wallet";
import { AppDispatch } from "../../store";
import { getExchangeRate as getRate, PaymentDetails, requestTxRef, TxBuyPayload, TxRequestPayload, updateTxRef } from "../../utils/bitmamaLib";
import { getBalance } from "../../utils/celo";
import formatter, { floatString, toUpper } from "../../utils/formatter";
import { localStorageKey, requestIdKey } from "../../utils/valoraLib";

const isValidEmail = (email: string) => {
  // eslint-disable-next-line
  const re = /^\S+@\S+[\.][0-9a-z]+$/;
  return re.test(email);
};

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
  get: (target: any, property: any, receiver: any) => {
    if (property in target) {
      return target[property];
    }
    return 10;
  },
};

function minimumProxy(obj: Partial<Record<string, number>>) {
  return new Proxy(obj, handler);
}

const minimumToken = minimumProxy({ celo: 5 });

function Buy(props: RouterProps & { path: string }) {
  const [copiedValue, setCopiedValue] = useState("")
  const { onCopy } = useClipboard(copiedValue)

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

  const {
    isOpen: confirmIsOpen,
    onOpen: confirmOnOpen,
    onClose: confirmOnClose,
  } = useDisclosure();

  const {
    isOpen: cancelIsOpen,
    onOpen: cancelOnOpen,
    onClose: cancelOnClose,
  } = useDisclosure();

  const [transferMethod, setTransferMethod] = useState<TransferType>();
  const [checkingRate, setCheckingRate] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [approvingState, setApprovingState] = useState("stepone");
  const [stepTwoData, setStepTwoData] = useState<TxBuyPayload | null>(null);
  const [actionState, setActionState] = useState("");
  const [fiatUnitRate, setFiatUnitRate] = useState(0);
  const [currentTab, setCurrentTab] = useState<"" | "newTab" | "redirectedTab">("");

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

  const _balance = balance || providedData?.balance;

  const isProcessable = useMemo(() => {
    if (
      (connected || true || _balance) &&
      providedData?.email &&
      isValidEmail(providedData?.email) &&
      sendValue &&
      fiat &&
      token &&
      transferMethod
    )
      return true;
    return false;
  }, [connected, _balance, transferMethod, sendValue, fiat, token, providedData?.email]);

  const submitTransaction = async (action?: "paid" | "cancel") => {
    try {
      setIsCompletedProcess(false);
      if(approvingState === "stepone") {
        if(isProcessable) {
          setActionState("tosteptwo")
          const txPayload = {
            destinationToken: token,
            sourceCurrency: (fiat === "ng" ? "ngn" : "ghs") as TxRequestPayload["sourceCurrency"],
            tokenAmount: Number(sendValue),
            transferMethod: (fiat === "ng" ? "bank-transfer" : "mobile-money") as TxRequestPayload["transferMethod"],
            email: providedData.email || "",
            phoneNumber: providedData.phone || "",
            fiatAmount: Number(receiveValue),
            destinationAddress: providedData?.address,
          };
          let resp = {
            ...txPayload,
            transactionReference: new Date().getTime().toString(36),
            status: "fiat-deposited",
            paymentDetails: (fiat === "ng" ? {
              bankCode: String(60543),
              accountName: "Ayo Daniel",
              bankName: "GTBank",
              accountNumber: String(Math.floor(Math.random() * 8778332323)),
            } : {
              network: "VODAFONE",
              phoneNumber: String(Math.floor(Math.random() * 8778332323)),
            }) as TxBuyPayload["paymentDetails"],
            timeout: 15,
            createdAt: new Date()
          } as TxBuyPayload

          if(2+2===4) {
            const respObj = await requestTxRef(txPayload);
            const newResp = {...respObj.data.message};
            if(!newResp.paymentDetails) {
              if(newResp.transferMethod === "bank-transfer") {
                newResp.paymentDetails = {
                  accountName: newResp?.accountName ?? "",
                  bank: newResp?.bank ?? "",
                  accountNumber: newResp?.accountNumber ?? "",
                }
              } else if(newResp.transferMethod === "mobile-money") {
                newResp.paymentDetails = {
                  network: newResp?.network ?? "",
                  phoneNumber: newResp?.phoneNumber ?? "",
                }
              } 
            }
            resp = {...txPayload,...newResp} as TxBuyPayload
          }
          console.log(resp)
          setStepTwoData(resp)
          setApprovingState("steptwo")
          setActionState("")
        }
      } else if (action === "paid") {
        setIsConfirming(true)
        const respObj = await updateTxRef(stepTwoData?.transactionReference ?? "", "paid");
        const newResp = {...respObj.data.message};
        if(!newResp.paymentDetails) {
          if(newResp.transferMethod === "bank-transfer") {
            newResp.paymentDetails = {
              accountName: newResp?.accountName ?? "",
              bank: newResp?.bank ?? "",
              accountNumber: newResp?.accountNumber ?? "",
            }
          } else if(newResp.transferMethod === "mobile-money") {
            newResp.paymentDetails = {
              network: newResp?.network ?? "",
              phoneNumber: newResp?.phoneNumber ?? "",
            }
          } 
        }
        setStepTwoData(newResp)
        setApprovingState("stepthreepaid")
        setIsConfirming(false)
      } else if (action === "cancel") {
        setIsCancelling(true)
        const respObj = await updateTxRef(stepTwoData?.transactionReference ?? "", "cancel");
        const newResp = {...respObj.data.message};
        if(!newResp.paymentDetails) {
          if(newResp.transferMethod === "bank-transfer") {
            newResp.paymentDetails = {
              accountName: newResp?.accountName ?? "",
              bank: newResp?.bank ?? "",
              accountNumber: newResp?.accountNumber ?? "",
            }
          } else if(newResp.transferMethod === "mobile-money") {
            newResp.paymentDetails = {
              network: newResp?.network ?? "",
              phoneNumber: newResp?.phoneNumber ?? "",
            }
          } 
        }
        setIsCompletedProcess(false);
        setStepTwoData(newResp)
        setApprovingState("stepthreecancelled")
        // setApprovingState("stepone")
        setIsCancelling(false)
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
      setActionState("");
      if(action === "paid") setIsConfirming(false)
      if(action === "paid") setIsConfirming(false)
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
      !isCompletedProcess && window.confirm("Are you sure you want to discard your inputs?");
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    handleTabState();
    // eslint-disable-next-line
  }, [props?.location?.search, currentTab]);

  // eslint-disable-next-line
  const phone = new URLSearchParams(props?.location?.search).get("phone");
  // eslint-disable-next-line
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

  const copyToClipboard = (text:any) => {
    if(!text) return;
    setCopiedValue(String(text))
    return onCopy()
  }

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

  const redebounce = useCallback((cb, functionName: Debouncable, delay: number) => {
    let timeout = debouncer.current[functionName];
    return function () {
      if (timeout) {
        clearTimeout(timeout);
        debouncer.current[functionName] = undefined;
      }
      debouncer.current[functionName] = setTimeout(cb, delay);
    };
    // eslint-disable-next-line
  }, []);

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
  };

  const handleSendValue = (e: any) => {
    setSendValue(e.target.value);
    redebounce(async () => await getExchangeRate(e, { _send: e.target.value }), "handleSendValue", 1500)();
  };

  // cleanups memory leaks
  useEffect(() => {
    const dc = debouncer.current;

    return () => {
      const debouncing = Object.keys(dc);
      debouncing.forEach((d) => {
        const timeout = dc[d];
        if (timeout) {
          clearTimeout(timeout);
          dc[d] = undefined;
        }
      });
    };
  }, []);

  /* eslint-disable */
  useEffect(() => {
    if (!providedData?.address) {
      redebounce(
        () => {
          if (token) {
            const addr = window.prompt(`Enter your ${token.toUpperCase()} address: `);
            if (addr) {
              if (debouncer.current["checkAddress"]) {
                clearTimeout(debouncer.current["checkAddress"]);
                debouncer.current["checkAddress"] = undefined;
              }
              setProvidedData({ ...providedData, address: addr });
              let url = new URL(window.location.href);
              let params = new URLSearchParams(url.search.slice(1));
              if (!params.has("address")) params.append("address", addr);
              if (!params.has("unit")) params.append("unit", token);
              if (!params.has("amount") && sendValue) params.append("amount", sendValue);
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
        },
        "checkAddress",
        4000
      )();
    }
    return () => {
      if (debouncer.current["checkAddress"]) {
        clearTimeout(debouncer.current["checkAddress"]);
        debouncer.current["checkAddress"] = undefined;
      }
    };
  }, [providedData?.address, showField.unit, token, sendValue]);
  /* eslint-enable */

  const isInvalidAmount = sendValue && token && Number(sendValue) < minimumToken[token];

  const errorInAmountField = () => {
    const isInvalidAmount = sendValue && token && Number(sendValue) < minimumToken[token];
    let errorMsg = ""
    if(isInvalidAmount) {
      errorMsg = `Minimum amount is ${minimumToken[token]} ${String(token).toUpperCase()}`
    } else if(sendValue && Number(sendValue) <= 0) {
          // errorMsg = `Amount must be greater than 0`
    }
    return errorMsg;
  }

  const receipientAccount = () => {
    let acc = "";
    if(approvingState === "steptwo" && stepTwoData?.paymentDetails) {
      const pDetail = stepTwoData.paymentDetails;
      if(pDetail) {
        const pFields = Object.keys(pDetail).filter((k:string) => k !== "type");
          pFields.forEach((k:string) => {
            acc += pDetail[k] + " "
          })
      }
    }
    return acc.trim();
  }

  const handleReceiveValue = (e: any) => {
    setReceiveValue(e.target.value);
    redebounce(async () => await getExchangeRate(e, { _receive: e.target.value }), "handleReceiveValue", 2000)();
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

  return (
    <>
      <Box as="form" boxShadow="base" p={["1rem 1.5rem", "2rem 2.5rem"]} w="100%" bg="white" borderRadius=".5rem">
        {connected && approvingState === "stepone" && (
          <Badge mb="20px" variant="solid" colorScheme="green">
            CONNECTED
          </Badge>
        )}
        {approvingState === "steptwo" ? (
          <VStack>
            <Heading textAlign="center" fontSize="md" m="20px 0 !important">
              Copy the account details and the transaction reference to complete your payment
            </Heading>
        </VStack>
        ) : null}
        {["stepone", "steptwo", "stepthreepaid", "stepthreecancelled"].includes(approvingState) ? (
          <>
            {approvingState === "stepone" ? <FormControl>
              <Box as="label">You Buy</Box>
              <HStack mt=".25rem">
                <Select
                  name="send"
                  fontSize=".85rem"
                  value={token ?? ""}
                  onChange={(e: any) => {
                    if (!showField.unit || actionState === "tosteptwo") return;
                    handleToken(e);
                  }}
                  // disabled={!showField.unit || actionState === "tosteptwo"}
                  isReadOnly={!showField.unit || actionState === "tosteptwo"}
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
                          disabled={actionState === "tosteptwo"}
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
                    disabled={!token || actionState === "tosteptwo"}
                    isReadOnly={!showField.amount || actionState === "tosteptwo"}
                  />
                  {checkingRate && !showField.amount && <InputRightElement children={<CircularProgress size="16px" isIndeterminate color="green.300" />} />}
                </InputGroup>
              </HStack>
              {_balance || connected ? (
                <HStack mt="4px">
                  <HStack width={"50%"}>
                    {balanceStatus === "loading" && <CircularProgress size="12px" isIndeterminate color="green.300" />}
                    <Box as="span" fontSize="10px" fontWeight="400" flexBasis={{ base: "50%" }} whiteSpace="nowrap">
                      Current Balance:{" "}
                      <strong>
                        {Number(Number(_balance).toFixed(4))} {token?.toUpperCase()}
                      </strong>
                    </Box>
                  </HStack>
                  {errorInAmountField() && token ? (
                    <HStack>
                      <Box as="span" fontSize="12px" fontWeight="400" color="red.200">
                        <p>{errorInAmountField()}</p>
                      </Box>
                    </HStack>
                  ) : null}
                </HStack>
              ) : null}
            </FormControl> : null}

            {approvingState === "stepone" ? (
              <FormControl mt="20px">
                <Box as="label">You Pay</Box>
                <HStack mt=".25rem">
                  <Select
                    name="receive"
                    fontSize=".85rem"
                    value={fiat ?? ""}
                    isReadOnly={actionState === "tosteptwo"}
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
                      disabled={actionState === "tosteptwo"}
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
            ) : null}
            
            {["steptwo", "stepthreepaid", "stepthreecancelled"].includes(approvingState) ? (
              <>
                <FormControl mt="20px">
                  <HStack mt=".25rem">
                    <Box bg="white" borderRadius="16px" h="fit-content">
                      <Stack p="32px">
                        <HStack
                          alignItems="flex-start"
                          justifyContent="space-between"
                        >
                          <Stack>
                            <Text color="#4E4B66" fontSize="sm">
                              Amount
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              mt="0px !important"
                            >
                              {/* ₦12,000 */}
                              {stepTwoData &&
                                formatter(stepTwoData?.sourceCurrency ?? "").format(stepTwoData?.fiatAmount ?? 0)}{" "}
                            </Text>
                          </Stack>
                          <Stack>
                            <Text color="#4E4B66" fontSize="sm">
                              Quantity
                            </Text>
                            <Text fontSize="sm" mt="0px !important">
                              {floatString(stepTwoData?.tokenAmount ?? 0)}{" "}
                              {toUpper(stepTwoData?.destinationToken ?? "")}
                            </Text>
                          </Stack>
                          <Stack>
                            <Text color="#4E4B66" fontSize="sm">
                              Transaction Fee
                            </Text>
                            <Text mt="0px !important" fontSize="sm">
                              {/* 19,190,000.00 */}
                              {floatString(stepTwoData?._fee ?? 0)}{" "}
                              {toUpper(stepTwoData?.destinationToken ?? "")}
                            </Text>
                          </Stack>
                        </HStack>


                        {approvingState === "steptwo" && <Box
                          mt="32px !important"
                          border="1px solid #D9DBE9"
                          bg="#F4F2FF"
                          p="28px 26px"
                          borderRadius="6px"
                        >
                          <Heading fontSize="sm">Account Details</Heading>
                          {stepTwoData?.transferMethod === "mobile-money" ?
                            (<HStack mt="18px" direction="row" gridGap="100px">
                              <VStack alignItems="flex-start">
                                <Text color="#4E4B66" fontSize="sm" mt="0px !important">
                                  Network
                                </Text>
                                <Text color="#4E4B66" fontSize="sm" mt="18px !important">
                                  Phone No.
                                </Text>
                              </VStack>

                              <VStack alignItems="flex-start">
                                <HStack mt="0px !important">
                                  <Text fontSize="sm" mt="0 !important">
                                    {/* MTN NG */}
                                    {(stepTwoData?.paymentDetails as PaymentDetails["mobile-money"]).network}
                                  </Text>
                                </HStack>

                                <HStack mt="16px !important" justifyContent="flex-start">
                                  <Text fontSize="sm">
                                    {/* 0123456789 */}
                                    {(stepTwoData?.paymentDetails as PaymentDetails["mobile-money"]).phoneNumber}
                                  </Text>
                                  <IconButton
                                    onClick={() => copyToClipboard((stepTwoData?.paymentDetails as any).phoneNumber)}
                                    size="xs"
                                    variant="ghost"
                                    aria-label="copy"
                                    icon={<CopyIcon color="#6E7191" />}
                                  />
                                </HStack>
                              </VStack>
                            </HStack>) : stepTwoData?.transferMethod === "bank-transfer" ? 
                            (<HStack mt="18px" direction="row" gridGap="100px">
                              <VStack alignItems="flex-start">
                                <Text color="#4E4B66" fontSize="sm" mt="0px !important">
                                  Name
                                </Text>
                                <Text color="#4E4B66" fontSize="sm" mt="18px !important">
                                  Bank
                                </Text>
                                <Text color="#4E4B66" fontSize="sm" mt="18px !important">
                                  Account No.
                                </Text>
                              </VStack>

                              <VStack alignItems="flex-start">
                                <HStack mt="0px !important">
                                  <Text fontSize="sm" mt="0 !important">
                                    {/* Chioma Adekunle Buhari */}
                                    {(stepTwoData?.paymentDetails as PaymentDetails["bank-transfer"]).accountName}
                                  </Text>
                                </HStack>

                                <HStack mt="16px !important">
                                  <Text fontSize="sm" mt="0 !important">
                                    {/* Guaranty Trust Bank */}
                                    {(stepTwoData?.paymentDetails as PaymentDetails["bank-transfer"]).bankName}
                                  </Text>
                                </HStack>

                                <HStack mt="16px !important" justifyContent="flex-start">
                                  <Text fontSize="sm">
                                    {/* 0123456789 */}
                                    {(stepTwoData?.paymentDetails as PaymentDetails["bank-transfer"]).accountNumber}
                                  </Text>
                                  <IconButton
                                  onClick={() => copyToClipboard((stepTwoData?.paymentDetails as PaymentDetails["bank-transfer"]).accountNumber)}
                                    size="xs"
                                    variant="ghost"
                                    aria-label="copy"
                                    icon={<CopyIcon color="#6E7191" />}
                                  />
                                </HStack>
                              </VStack>
                            </HStack>) : null
                          }
                        </Box>}

                        {approvingState === "stepthreepaid" ? 
                          <Box
                            mt="32px !important"
                            border="1px solid #D9DBE9"
                            bg="#F4F2FF"
                            p="28px 26px"
                            borderRadius="6px"
                          >
                            <Heading fontSize="sm">Awaiting Payment Clearance</Heading>

                            <HStack mt="12px">
                              <Text fontSize="sm" color="#4E4B66">
                                You will be credited with {floatString(stepTwoData?.tokenAmount ?? 0)} {toUpper(stepTwoData?.destinationToken ?? "")} once your payment is cleared.
                              </Text>
                            </HStack>
                          </Box> : approvingState === "stepthreecancelled" ? 
                          <Box
                            mt="32px !important"
                            border="1px solid #D9DBE9"
                            bg="#F4F2FF"
                            p="28px 26px"
                            borderRadius="6px"
                          >
                            <Heading fontSize="sm">Transaction Cancelled</Heading>

                            <HStack mt="12px">
                              <Text fontSize="sm" color="#4E4B66">
                                You have successfully cancelled the transaction, Feel free to initiate a
                                new trade
                              </Text>
                            </HStack>
                          </Box> : approvingState === "stepthreetimedout" ?
                          <Box
                            mt="32px !important"
                            border="1px solid #D9DBE9"
                            bg="#F4F2FF"
                            p="28px 26px"
                            borderRadius="6px"
                          >
                            <Heading fontSize="sm">Transaction Timedout</Heading>
                    
                            <HStack mt="12px">
                              <Text fontSize="sm" color="#4E4B66">
                                Transaction timedout.
                              </Text>
                            </HStack>
                          </Box> : null}

                        {["stepthreepaid", "stepthreetimedout","stepthreecompleted", "stepthreecancelled"].includes(approvingState) && 
                          <>
                            <Stack mt="24px !important">
                              <Text fontSize="sm">Restart</Text>

                              <Text mt="32px !important" fontSize="sm" color="#4E4B66" onClick={() => {
                                setApprovingState("stepone")
                              }}>
                                Start a new transaction
                              </Text>
                            </Stack>

                          </>
                        }
                        
                        {approvingState === "steptwo" && 
                          <>
                            <Stack mt="24px !important">
                              <Text fontSize="sm">Time limit</Text>
                              <Text fontSize="sm" mt="0 !important" color="#03A438">
                              {stepTwoData?.timeout ?? 10}:00
                              </Text>

                              <Text mt="32px !important" fontSize="sm" color="#4E4B66">
                                Please ensure payment is made within {stepTwoData?.timeout ?? 10}:00
                                mins, else transaction would be cancelled.
                              </Text>
                            </Stack>

                            <HStack
                              mt="40px !important"
                              pb="40px"
                              justifyContent="center"
                              gridGap="20px"
                            >
                              <Button
                                // h="56px"
                                onClick={cancelOnOpen}
                                minW="120px !important"
                                // px="10px"
                                bg="transparent"
                                border="2px solid transparent"
                                color="#03A438"
                              >
                                Cancel
                              </Button>
                              <Button onClick={confirmOnOpen} minW="120px !important">
                                Paid
                              </Button>
                            </HStack>

                            <ConfirmationModal
                              isOpen={confirmIsOpen}
                              onClose={confirmOnClose}
                              isLoading={isConfirming}
                              onConfirm={() => submitTransaction("paid")}
                              title="Confirm payment"
                            >
                              <VStack>
                                <Text textAlign="center">
                                  Please confirm that you have make payment of{" "}
                                  <strong>
                                  {formatter(stepTwoData?.sourceCurrency ?? "").format(stepTwoData?._fiatAmount ?? 0)}
                                  </strong>{" "}
                                  to {receipientAccount()}.
                                </Text>
                              </VStack>
                            </ConfirmationModal>

                            <ConfirmationModal
                            isOpen={cancelIsOpen}
                            onClose={cancelOnClose}
                            isLoading={isCancelling}
                            onConfirm={() => submitTransaction("cancel")}
                            title="Confirm"
                          >
                            <VStack>
                              <Text textAlign="center">
                                By cancelling this transaction, the transaction reference will no longer be eligible to any claims or liability.
                              </Text>
                            </VStack>
                          </ConfirmationModal>
                          </>
                        }
                      </Stack>
                    </Box>
                </HStack>
                </FormControl>
              </>) : null
            }

            {approvingState === "stepone" ? 
            <>
              <FormControl mt="20px">
                <HStack>
                  <Box as="label">Email Address</Box>
                </HStack>
                <VStack>
                  <InputGroup>
                    <Input
                      disabled={actionState === "tosteptwo"}
                      isReadOnly={actionState === "tosteptwo"}
                      type="email"
                      isInvalid={providedData?.email && !isValidEmail(providedData?.email) ? true : false}
                      value={providedData?.email || ""}
                      onChange={(e: any) => {
                        redebounce(
                          async () => {
                            if (!isValidEmail(e.target.value)) {
                              toast({
                                title: "Oops!! Invalid Input",
                                description: "Email is invalid",
                                status: "error",
                                duration: 3000,
                                isClosable: true,
                              });
                            }
                          },
                          "validateEmail",
                          3000
                        )();
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
                    isReadOnly={actionState === "tosteptwo"}
                  >
                    <option value="bank">{fiat === "gh" ? "Bank/Mobile Money" : "Bank Transfer"}</option>
                    {/* {fiat === "gh" && <option value="mobileMoney">Mobile Money</option>} */}
                  </Select>
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
                disabled={!isProcessable}
              >
                {actionState === "tosteptwo" ? (
                  <CircularProgress size="16px" isIndeterminate color="green.300" />
                ) : (
                  "Next"
                )}
              </Button>
            </> : null}

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
     
    </>
  );
}

export default Buy;

