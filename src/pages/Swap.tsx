import { Box, Container, Tabs, Tab, TabList, TabPanels, TabPanel, VStack, Image, Heading } from "@chakra-ui/react";

import { Withdraw, Buy } from "./panels";

const Swap = (props: any) => {
  return (
    <Box
      p="50px 0"
      minH="100vh"
      sx={{
        "--focusColor": "#04a5378f",
      }}
    >
      <Box bg="rgba(249,250,251,1)" h="100%">
        <Container maxW={["container.xl", "xl"]} h="100%">
          <VStack p={["40px 0", "40px"]}>
            <VStack>
              <Image w="121px" h="48px" src="https://prod-doc.fra1.cdn.digitaloceanspaces.com/btm-assets/logo.png" />
              <Heading textAlign="center" fontSize="2xl" m="20px 0 !important">
                Withdraw cEUR/cUSD
              </Heading>
            </VStack>

            <VStack
              bg="white"
              shadow="base"
              borderRadius=".5rem"
              // overflow="hidden"
            >
              <Tabs isFitted>
                <TabList
                  borderBottom="none"
                  bg="white"
                  // shadow="base"
                  borderRadius="4px 4px 0 0"
                >
                  <Tab
                    borderRadius=".5rem 0 0 0"
                    _focus={{ shadow: "0 0 0 2px var(--focusColor)" }}
                    _selected={{ color: "green.400", borderColor: "green.400" }}
                  >
                    Withdraw
                  </Tab>
                  <Tab
                    borderRadius="0 .5rem 0 0"
                    _focus={{ shadow: "0 0 0 2px var(--focusColor)" }}
                    _selected={{ color: "green.400", borderColor: "green.400" }}
                  >
                    Buy
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={[0]}>
                    <Withdraw {...props} />
                  </TabPanel>
                  <TabPanel p={[0]}>
                    <Buy {...props} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </VStack>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default Swap;
