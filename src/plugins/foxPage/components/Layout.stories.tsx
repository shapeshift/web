/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { SimpleGrid, TabList, Tabs } from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { useTranslate } from 'react-polyglot'
import { fox } from 'test/mocks/assets'

import { FoxTab } from './FoxTab'
import { Layout } from './Layout'
import { Total } from './Total'

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

  return (
    <Layout
      title={translate('plugins.foxPage.foxToken', {
        assetSymbol: mockAsset.symbol,
      })}
      description={mockAsset.description}
      icon={'https://assets.coincap.io/assets/icons/fox@2x.png'}
    >
      <Tabs variant='unstyled'>
        <TabList>
          <SimpleGrid
            gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(4, 1fr)' }}
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
            <FoxTab
              assetSymbol={mockAsset.symbol}
              assetIcon={mockAsset.icon}
              isSelected={true}
              cryptoAmount={'3000'}
              fiatAmount={'1000'}
              onClick={() => {}}
            />
            <FoxTab
              assetSymbol={mockAsset.symbol}
              assetIcon={mockAsset.icon}
              cryptoAmount={'3000'}
              fiatAmount={'1000'}
              onClick={() => {}}
            />
            <FoxTab
              assetSymbol={mockAsset.symbol}
              assetIcon={mockAsset.icon}
              cryptoAmount={'3000'}
              fiatAmount={'1000'}
              onClick={() => {}}
            />
          </SimpleGrid>
        </TabList>

        {/*  <TabPanels>
          <TabPanel p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <Text>{'Fox Page'}</Text>
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
                <AssetActions
                  assetId={mockAsset.icon}
                  assetSymbol={mockAsset.symbol}
                  description={mockAsset.description}
                  buyCTA={translate('plugins.foxPage.buyAssetOnCoinbase', {
                    assetSymbol: mockAsset.symbol,
                  })}
                  sellCTA='plugins.foxPage.receive'
                  onReceiveClick={() => null}
                  onBuyClick={() => null}
                />
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <Text>{'Foxy Page'}</Text>
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
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <Text>{'oneFOX page'}</Text>
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
              </Stack>
            </Stack>
          </TabPanel>
        </TabPanels> */}
      </Tabs>
    </Layout>
  )
}
