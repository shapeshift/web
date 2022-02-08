import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue
} from '@chakra-ui/react'
import { Text as ChakraText } from '@chakra-ui/react'
import { getConfig } from 'config'
import { useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Page } from 'components/Layout/Page'
import { Text } from 'components/Text'

export const GemBuySell = () => {
  const location: any = useLocation()
  const bgGray = useColorModeValue('gray.200', 'gray.700')
  return (
    <Page>
      <Flex mt={'20%'} ml={'170%'}>
        <Card textAlign='center' py={6} boxShadow='none' borderWidth={0}>
          <Card.Body>
            <Tabs isFitted variant='soft-rounded' colorScheme='blue'>
              <TabList>
                <Tab>
                  <Text translation='buysell.page.buy' />
                </Tab>
                <Tab>
                  <Text translation='buysell.page.sell' />
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <Flex
                    justifyContent={'flex-start'}
                    flexDirection={'column'}
                    alignItems={'flex-start'}
                  >
                    <Text lineHeight={1} translation='buysell.page.assestBuyMessage' />
                    <Box mt={'5%'}>
                      <Menu>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                          <Text translation='buysell.page.selectAnAssestToBuy' />
                        </MenuButton>
                        <MenuList>
                          {location.state.buyCoinList.map(
                            (buyCoin: { ticker: string; name: string }) => {
                              return (
                                <MenuItem>
                                  <Box>
                                    <Button
                                      variant='ghost'
                                      isActive={true}
                                      justifyContent='flex-start'
                                      _focus={{
                                        shadow: 'outline-inset'
                                      }}
                                      p={'25px'}
                                    >
                                      <Avatar
                                        src={
                                          getConfig().REACT_APP_GEM_ASSET_LOGO +
                                          buyCoin.ticker.toLowerCase() +
                                          '.svg'
                                        }
                                        bg={bgGray}
                                      />
                                      <Box textAlign='left'>
                                        <ChakraText lineHeight={1}>{buyCoin.name}</ChakraText>
                                        <ChakraText fontWeight='normal' fontSize='sm'>
                                          {buyCoin.ticker}
                                        </ChakraText>
                                      </Box>
                                    </Button>
                                  </Box>
                                </MenuItem>
                              )
                            }
                          )}
                        </MenuList>
                      </Menu>
                    </Box>
                  </Flex>
                  <Flex
                    justifyContent={'center'}
                    flexDirection={'column'}
                    alignItems={'center'}
                    mt={'15%'}
                  >
                    <Box>
                      <Button>
                        <Text translation='buysell.page.continue' />
                      </Button>
                    </Box>
                    <Box marginTop={'5%'}>
                      <Button>
                        <Text translation='buysell.page.cancel' />
                      </Button>
                    </Box>
                  </Flex>
                </TabPanel>
                <TabPanel>
                  <Flex
                    justifyContent={'flex-start'}
                    flexDirection={'column'}
                    alignItems={'flex-start'}
                  >
                    <Text lineHeight={1} translation='buysell.page.assestSellMessage' />
                    <Box mt={'5%'}>
                      <Menu>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                          <Text translation='buysell.page.selectAnAssestToSell' />
                        </MenuButton>
                        <MenuList>
                          {location.state.sellCoinList.map(
                            (sellCoin: { ticker: string; name: string }) => {
                              return (
                                <MenuItem>
                                  <Box>
                                    <Button
                                      variant='ghost'
                                      isActive={true}
                                      justifyContent='flex-start'
                                      _focus={{
                                        shadow: 'outline-inset'
                                      }}
                                      padding={'25px'}
                                    >
                                      <Avatar
                                        src={
                                          getConfig().REACT_APP_GEM_ASSET_LOGO +
                                          sellCoin.ticker.toLowerCase() +
                                          '.svg'
                                        }
                                        bg={bgGray}
                                      />
                                      <Box textAlign='left'>
                                        <ChakraText lineHeight={1}>{sellCoin.name}</ChakraText>
                                        <ChakraText fontWeight='normal' fontSize='sm'>
                                          {sellCoin.ticker}
                                        </ChakraText>
                                      </Box>
                                    </Button>
                                  </Box>
                                </MenuItem>
                              )
                            }
                          )}
                        </MenuList>
                      </Menu>
                    </Box>
                  </Flex>
                  <Flex
                    justifyContent={'center'}
                    flexDirection={'column'}
                    alignItems={'center'}
                    mt={'15%'}
                  >
                    <Box>
                      <Button>
                        <Text translation='buysell.page.continue' />
                      </Button>
                    </Box>
                    <Box mt={'5%'}>
                      <Button>
                        <Text translation='buysell.page.cancel' />
                      </Button>
                    </Box>
                  </Flex>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Card.Body>
        </Card>
      </Flex>
    </Page>
  )
}
