/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { SimpleGrid } from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { fox } from 'test/mocks/assets'

import { Tab } from './Tab'
import { Total } from './Total'

export default {
  title: 'Plugins/FoxPage/Tab',
  component: Tab,
}

export const FoxPageTabs: Story = () => (
  <SimpleGrid
    gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(4, 1fr)' }}
    gridGap={4}
    mb={4}
  >
    <Total
      fiatAmount={'6000'}
      icons={[
        'https://assets.coincap.io/assets/icons/fox@2x.png',
        'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethTokens/icons/foxy-icon.png',
        'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x03352D267951E96c6F7235037C5DFD2AB1466232/logo.png',
      ]}
    />
    <Tab asset={fox} isActive={true} cryptoAmount={'3000'} fiatAmount={'1000'} />
    <Tab asset={fox} cryptoAmount={'3000'} fiatAmount={'1000'} />
    <Tab asset={fox} cryptoAmount={'3000'} fiatAmount={'1000'} />
  </SimpleGrid>
)
