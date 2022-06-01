/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Stack,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { fox } from 'test/mocks/assets'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './AssetActions'
import { FoxOpportunity } from './FoxOpportunity'
import { FoxTab } from './FoxTab'
import { Layout } from './Layout'
import { OtherOpportunities } from './OtherOpportunities/OtherOpportunities'
import { Total } from './Total'
import { TradeOpportunities } from './TradeOpportunities'

export default {
  title: 'Plugins/FoxPage/Layout',
  component: Layout,
}

const mockAsset = {
  ...fox,
  description:
    'FOX is an ERC-20 token created by ShapeShift which serves as the governance token for the ShapeShift DAO, token holders can vote on proposals relating to the operation...',
}

export const FoxLayout: Story = () => {
  const translate = useTranslate()
  const [selectedTabIndex, setSelectedTabIndex] = useState(0)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const mobileTabBg = useColorModeValue('gray.100', 'gray.750')

  return (
    <Layout
      title={translate('plugins.foxPage.foxToken', {
        assetSymbol: mockAsset.symbol,
      })}
      description={mockAsset.description}
      icon={'https://assets.coincap.io/assets/icons/fox@2x.png'}
    >
      <Tabs variant='unstyled' index={selectedTabIndex}>
        <TabList flexDirection={{ base: 'column', md: 'row' }}>
          <SimpleGrid
            gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
            gridGap={4}
            mb={4}
            width='full'
          >
            <Total
              fiatAmount={'6000'}
              icons={[
                'https://assets.coincap.io/assets/icons/fox@2x.png',
                'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethTokens/icons/foxy-icon.png',
                'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x03352D267951E96c6F7235037C5DFD2AB1466232/logo.png',
              ]}
            />
            {isLargerThanMd && (
              <>
                <FoxTab
                  assetSymbol={mockAsset.symbol}
                  assetIcon={mockAsset.icon}
                  isSelected={true}
                  cryptoAmount={'3000'}
                  fiatAmount={'1000'}
                  onClick={() => {
                    setSelectedTabIndex(0)
                  }}
                />
                <FoxTab
                  assetSymbol={mockAsset.symbol}
                  assetIcon={mockAsset.icon}
                  cryptoAmount={'3000'}
                  fiatAmount={'1000'}
                  onClick={() => {
                    setSelectedTabIndex(1)
                  }}
                />
              </>
            )}
          </SimpleGrid>
          {!isLargerThanMd && (
            <Box mb={4}>
              <Menu>
                <MenuButton
                  borderWidth='2px'
                  borderColor='primary'
                  height='auto'
                  as={Button}
                  rightIcon={<ChevronDownIcon />}
                  bg={mobileTabBg}
                  width='full'
                >
                  <FoxTab
                    assetSymbol={mockAsset.symbol}
                    assetIcon={mockAsset.icon}
                    cryptoAmount={'3000'}
                    fiatAmount={'1000'}
                  />
                </MenuButton>
                <MenuList>
                  <MenuItem
                    onClick={() => {
                      setSelectedTabIndex(0)
                    }}
                  >
                    <FoxTab
                      assetSymbol={mockAsset.symbol}
                      assetIcon={mockAsset.icon}
                      cryptoAmount={'3000'}
                      fiatAmount={'1000'}
                      onClick={() => {
                        setSelectedTabIndex(0)
                      }}
                    />
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setSelectedTabIndex(1)
                    }}
                  >
                    <FoxTab
                      assetSymbol={mockAsset.symbol}
                      assetIcon={mockAsset.icon}
                      cryptoAmount={'3000'}
                      fiatAmount={'1000'}
                      onClick={() => {
                        setSelectedTabIndex(1)
                      }}
                    />
                  </MenuItem>
                </MenuList>
              </Menu>
            </Box>
          )}
        </TabList>

        <TabPanels>
          <TabPanel key={'0'} p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <FoxOpportunity
                  balance='--'
                  assetSymbol={mockAsset.symbol}
                  tvl={'150000000'}
                  apy='0.1161'
                  onClick={() => null}
                />
                <OtherOpportunities description={'plugins.foxPage.otherOpportunitiesDescription'} />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
                <AssetActions
                  assetIcon={mockAsset.icon}
                  assetSymbol={mockAsset.symbol}
                  description={mockAsset.description}
                  buyCTA={translate('plugins.foxPage.buyAssetOnCoinbase', {
                    assetSymbol: mockAsset.symbol,
                  })}
                  sellCTA='plugins.foxPage.receive'
                  onReceiveClick={() => null}
                  onBuyClick={() => null}
                />
                <TradeOpportunities />
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel key={'1'} p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <FoxOpportunity
                  balance='--'
                  assetSymbol={mockAsset.symbol}
                  tvl={'150000000'}
                  apy='0.1161'
                  onClick={() => null}
                />
                <OtherOpportunities description={'plugins.foxPage.otherOpportunitiesDescription'} />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
                <AssetActions
                  assetIcon={mockAsset.icon}
                  assetSymbol={mockAsset.symbol}
                  description={mockAsset.description}
                  buyCTA={translate('plugins.foxPage.buyAssetOnCoinbase', {
                    assetSymbol: mockAsset.symbol,
                  })}
                  sellCTA='plugins.foxPage.receive'
                  onReceiveClick={() => null}
                  onBuyClick={() => null}
                />
                <TradeOpportunities />
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel key={'2'} p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <FoxOpportunity
                  balance='--'
                  assetSymbol={mockAsset.symbol}
                  tvl={'150000000'}
                  apy='0.1161'
                  onClick={() => null}
                />
                <OtherOpportunities description={'plugins.foxPage.otherOpportunitiesDescription'} />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
                <AssetActions
                  assetIcon={mockAsset.icon}
                  assetSymbol={mockAsset.symbol}
                  description={mockAsset.description}
                  buyCTA={translate('plugins.foxPage.buyAssetOnCoinbase', {
                    assetSymbol: mockAsset.symbol,
                  })}
                  sellCTA='plugins.foxPage.receive'
                  onReceiveClick={() => null}
                  onBuyClick={() => null}
                />
                <TradeOpportunities />
              </Stack>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  )
}
