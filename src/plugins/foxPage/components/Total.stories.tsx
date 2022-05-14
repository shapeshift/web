/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Story } from '@storybook/react'

import { Total } from './Total'

export default {
  title: 'Plugins/FoxPage/Total',
  component: Total,
}

export const FoxPageTotal: Story = () => (
  <Total
    fiatAmount={'6000'}
    icons={[
      'https://assets.coincap.io/assets/icons/fox@2x.png',
      'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethTokens/icons/foxy-icon.png',
      'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x03352D267951E96c6F7235037C5DFD2AB1466232/logo.png',
    ]}
  />
)
