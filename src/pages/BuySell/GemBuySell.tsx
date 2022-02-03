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
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Page } from 'components/Layout/Page'

export const GemBuySell = () => {
  const location = useLocation()
  return (
    <div>
      <Page>
        <Flex marginTop={'20%'} marginLeft={'170%'}>
          <Card textAlign='center' py={6} boxShadow='none' borderWidth={0}>
            <Card.Body>
              <Tabs isFitted variant='soft-rounded' colorScheme='blue'>
                <TabList>
                  <Tab>Buy</Tab>
                  <Tab>Sell</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel>
                    <Flex
                      justifyContent={'flex-start'}
                      flexDirection={'column'}
                      alignItems={'flex-start'}
                    >
                      <Text lineHeight={1}>Assest to Buy</Text>
                      <Box marginTop={'5%'}>
                        <Menu>
                          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                            Select an assest to buy
                          </MenuButton>
                          <MenuList>
                            {location.state.buyCoinList.map(buyCoin => {
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
                                        src={`https://gem-widgets-assets.s3-us-west-2.amazonaws.com/currencies/crypto/${buyCoin.ticker.toLowerCase()}.svg`}
                                        bg={useColorModeValue('gray.200', 'gray.700')}
                                      />
                                      <Box textAlign='left'>
                                        <Text lineHeight={1}>{buyCoin.name}</Text>
                                        <Text fontWeight='normal' fontSize='sm'>
                                          {buyCoin.ticker}
                                        </Text>
                                      </Box>
                                    </Button>
                                  </Box>
                                </MenuItem>
                              )
                            })}
                          </MenuList>
                        </Menu>
                      </Box>
                    </Flex>
                    <Flex
                      justifyContent={'center'}
                      flexDirection={'column'}
                      alignItems={'center'}
                      marginTop={'15%'}
                    >
                      <Box>
                        <Button>Continue</Button>
                      </Box>
                      <Box marginTop={'5%'}>
                        <Button>Cancel</Button>
                      </Box>
                    </Flex>
                  </TabPanel>
                  <TabPanel>
                    <Flex
                      justifyContent={'flex-start'}
                      flexDirection={'column'}
                      alignItems={'flex-start'}
                    >
                      <Text lineHeight={1}>Assest to sell</Text>
                      <Box marginTop={'5%'}>
                        <Menu>
                          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                            Select an assest to sell
                          </MenuButton>
                          <MenuList>
                            {location.state.sellCoinList.map(sellCoin => {
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
                                        src={`https://gem-widgets-assets.s3-us-west-2.amazonaws.com/currencies/crypto/${sellCoin.ticker.toLowerCase()}.svg`}
                                        bg={useColorModeValue('gray.200', 'gray.700')}
                                      />
                                      <Box textAlign='left'>
                                        <Text lineHeight={1}>{sellCoin.name}</Text>
                                        <Text fontWeight='normal' fontSize='sm'>
                                          {sellCoin.ticker}
                                        </Text>
                                      </Box>
                                    </Button>
                                  </Box>
                                </MenuItem>
                              )
                            })}
                          </MenuList>
                        </Menu>
                      </Box>
                    </Flex>
                    <Flex
                      justifyContent={'center'}
                      flexDirection={'column'}
                      alignItems={'center'}
                      marginTop={'15%'}
                    >
                      <Box>
                        <Button>Continue</Button>
                      </Box>
                      <Box marginTop={'5%'}>
                        <Button>Cancel</Button>
                      </Box>
                    </Flex>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Card.Body>
          </Card>
        </Flex>
      </Page>
    </div>
  )
}
