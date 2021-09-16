import { Box, Container, Heading, Image, Tab, TabList, TabPanel, TabPanels, Tabs, VStack } from "@chakra-ui/react";
import { useNavigate } from "@reach/router";
import { useState } from "react";
import { Buy, Withdraw } from "./panels";


enum TabSubject  {
  withdraw = "Widthdraw",
  buy = "Buy"
}

const tabs = ["withdraw", "buy"];

const Swap = (props: any) => {
  const [tabIndex, setTabIndex] = useState(String(props.action).toLowerCase() === "buy" ? 1 : 0)
  const currentTab = tabs[tabIndex] || "withdraw";
  const navigate = useNavigate();

  const handleTabsChange = (index:number) => {
    
    try{
      let url = new URL(window.location.href);
      let params = new URLSearchParams(url.search.slice(1));
      if(index === 0) navigate(`/?${params}`);
      if(index === 1) navigate(`/buy/?${params}`);
    } catch(err:any) {
    }
    setTabIndex(index)
  }

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
                {TabSubject[currentTab]} cEUR/cUSD
              </Heading>
            </VStack>

            <VStack
              bg="white"
              shadow="base"
              borderRadius=".5rem"
              // overflow="hidden"
            >
              <Tabs isFitted index={tabIndex} onChange={handleTabsChange}>
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
