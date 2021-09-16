import {
    WarningTwoIcon
} from "@chakra-ui/icons";
import {
    Box, Center, CircularProgress, Container, Flex, FormControl,
    Heading,
    HStack, Stack, Text, VStack
} from "@chakra-ui/react";
import { FC } from "react";

export type BuyRefProps = {
    view: "" | "loading" | "error" | "notfound" | "loaded",
    error?: string,
    startNew?: () => void,
}

const BuyRefPage:FC<BuyRefProps> = ({view, error, startNew}) => {
    return (
        <FormControl mt="20px">
                  <HStack mt=".25rem">
                    <Box bg="white" borderRadius="16px" h="fit-content">

                      <Stack p="32px">
                        {(view === "loading") && <Box p="10px 0" minH="20vh">
                            <Box bg="rgba(249,250,251,1)" h="100%">
                                <Container maxW={["container.xl", "xl"]} h="100%">
                                    <VStack p={["10px 0", "10px"]}>
                                        <VStack>

                                        <Heading textAlign="center" fontSize="sm" m="40px 0 !important">
                                            {view === "loading" ? <Box m="0 0 1rem 0 !important">Loading &nbsp;&nbsp;</Box> : null}
                                            <CircularProgress size="48px" isIndeterminate color="green.300" />
                                        </Heading>
                                        </VStack>
                                    </VStack>
                                </Container>
                            </Box>
                        </Box>}
                        
                        {view === "error" && error && 
                          <>
                          <Flex color="white" justify="center">
                            <Center w="100px">
                                <HStack mt="1.5rem" mb="1.5rem">
                                <WarningTwoIcon w={16} h={16} color="red.500" />
                                </HStack>
                            </Center>
                            </Flex>
                            <Stack mt="24px !important">
                              <Text mt="32px !important" fontSize="sm" color="#4E4B66">
                                {error ? String(error) : "" }
                              </Text>
                            </Stack>
                          </>
                        }
                        {view === "notfound" && 
                          <>
                          <Flex color="white" justify="center">
                            <Center w="100px">
                                <HStack mt="1.5rem" mb="1.5rem">
                                <WarningTwoIcon w={16} h={16} color="red.500" />
                                </HStack>
                            </Center>
                            </Flex>
                            <Stack mt="24px !important">
                              <Text mt="32px !important" fontSize="sm" color="#4E4B66">
                                {error ? String(error) : "Transaction reference is invalid" }
                              </Text>
                            </Stack>
                          </>
                        }

                        {startNew ? <Stack mt="24px !important">
                            <Text mt="32px !important" fontSize="sm" color="#4E4B66" onClick={() => {
                                startNew()
                            }}>
                            Start a new transaction
                            </Text>
                        </Stack> : null}

                      </Stack>
                    </Box>
                </HStack>
            </FormControl>
    )
}

export default BuyRefPage
