import {
  Box,
  Container,
  FormControl,
  Heading,
  HStack,
  Image,
  VStack,
  InputGroup,
  InputRightElement,
  CircularProgress,
  useToast,
  IconButton,
  Badge,
  InputLeftElement,
} from "@chakra-ui/react";
import React from "react";
import { Input, Select, Button } from "../components";
import {
  useGetBanksByCountryQuery,
  useResolveAccountMutation,
} from "../services/bankApi";

import debounce from "lodash/debounce";
import { getExchangeRate as getRate } from "../utils/bitmamaLib";
import { IExchangeRate } from "../interfaces";

import { RepeatIcon } from "@chakra-ui/icons";
import {
  getWalletBalance,
  selectWallet,
  setWalletDetails,
} from "../slice/wallet";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../store";
import { RouterProps } from "@reach/router";
import { transferToken, transferToken2 } from "../utils/celo";

type FiatType = "ng" | "gh";
type TransferType = "bank" | "mobileMoney";
type TokenType = "celo" | "cusd" | "ceur";

function Swap(props: RouterProps & { path: string }) {
  const [fiat, setFiat] = React.useState<FiatType>();
  const [token, setToken] = React.useState<TokenType>();
  const [sendValue, setSendValue] = React.useState<string>();
  const [receiveValue, setReceiveValue] = React.useState<string>();
  const [transferMethod, setTransferMethod] = React.useState<TransferType>();
  const [checkingRate, setCheckingRate] = React.useState<boolean>(false);

  const [bankCode, setBankCode] = React.useState<string | undefined>();
  const [accountNumber, setAccountNumber] = React.useState<
    string | undefined
  >();

  const [skipBankListLoad, setSkipBankListLoad] = React.useState(true);

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
    skip: skipBankListLoad,
  });

  const [
    resolveAccount,
    { data: bankDetail, isLoading: fetchingDetail, error: bankDetailError },
  ] = useResolveAccountMutation();

  const isApprovable = () => {
    if (
      connected &&
      balance &&
      Number(sendValue) <= balance &&
      accountNumber?.length! > 10 &&
      fiat &&
      token
    )
      return true;
    return false;
  };

  const submitTransaction = async () => {
    console.log(
      "BUTTON PRESSED:::",
      accountNumber,
      token,
      fiat,
      sendValue,
      receiveValue,
      transferMethod,
      bankCode
    );

    const trans = await transferToken(
      "cusd",
      1,
      "0xbaff2fbc4afb436b39d93b6c5d5591704c561043"
    );

    // const trans = await transferToken2();
    return "again";
  };

  //   console.log("ACCOUNT DETAILS ERROR", bankDetailError);

  React.useEffect(() => {
    if (bankDetailError || bankListError) {
      toast({
        title: "Oops!! something went wrong",
        description: ((bankDetailError ?? bankListError) as any)?.data.message,
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  }, [bankListError, bankDetailError, toast]);

  const phone = new URLSearchParams(props?.location?.search).get("phone");
  const address = new URLSearchParams(props?.location?.search).get("address");

  React.useEffect(() => {
    if (phone && address) {
      dispatch(
        setWalletDetails({
          address,
          phoneNumber: phone,
        })
      );
    }
  }, [phone, address, dispatch]);

  React.useEffect(() => {
    if (balance) {
      handleSendValue({ target: { value: String(balance) } });
    }
  }, [balance]);

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

  const debouncedResolveAccount = React.useCallback(
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
                {connected && (
                  <Badge mb="20px" variant="solid" colorScheme="green">
                    CONNECTED
                  </Badge>
                )}
                <FormControl>
                  <Box as="label">You Send</Box>
                  <HStack mt=".25rem">
                    <Select
                      name="send"
                      fontSize=".85rem"
                      value={token}
                      onChange={handleToken}
                      placeholder="Choose Token"
                    >
                      <option value="celo">CELO</option>
                      <option value="cusd">cUSD</option>
                      <option value="ceur">cEUR</option>
                    </Select>

                    <InputGroup>
                      {balance && (
                        <InputLeftElement
                          pl="8px"
                          children={
                            <Button
                              onClick={() =>
                                handleSendValue({
                                  target: { value: String(balance) },
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
                        pl={balance ? "44px" : "16px"}
                        name="crypto"
                        value={sendValue}
                        onChange={handleSendValue}
                        colorScheme="green"
                        type="number"
                        disabled={!token}
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
                  <HStack mt="4px">
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
                        {balance} {token?.toUpperCase()}
                      </strong>
                    </Box>
                  </HStack>
                </FormControl>

                <FormControl mt="20px">
                  <Box as="label">You Receive</Box>
                  <HStack mt=".25rem">
                    <Select
                      name="receive"
                      fontSize=".85rem"
                      value={fiat}
                      onChange={handleFiat}
                      placeholder="Choose Fiat"
                    >
                      <option value="ng">Nigerian Naira (NGN)</option>
                      <option value="gh">Ghanian Cedis (GHC)</option>
                    </Select>

                    <InputGroup>
                      <Input
                        name="fiat"
                        value={receiveValue}
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
                </FormControl>

                {fiat && (
                  <FormControl mt="20px">
                    <Box as="label">Transfer Method</Box>
                    <Select
                      mt=".25rem"
                      fontSize=".85rem"
                      value={transferMethod}
                      onChange={handleTransferMethod}
                      placeholder="Choose Transfer Method"
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
                        value={bankCode}
                        onChange={handleBankCode}
                        placeholder="Choose Bank"
                      >
                        {data?.map(({ code, name }) => (
                          <option value={code}>{name}</option>
                        ))}
                      </Select>
                      <InputGroup>
                        <Input
                          disabled={!bankCode}
                          type="number"
                          placeholder="Account Number"
                          value={accountNumber}
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
                                  resolveAccount({
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
                >
                  Approve Spend
                </Button>
              </Box>
            </VStack>
          </Container>
        </Box>
      </Box>
    </>
  );
}

export default Swap;
