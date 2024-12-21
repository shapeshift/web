import type { AssetsById } from '@shapeshiftoss/types'
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { decodeAssetData } from './decodeAssetData'
import { encodeAssetData } from './encodeAssetData'

const mockGeneratedAssetData: AssetsById = {
  'bip122:000000000019d6689c085ae165831e93/slip44:0': {
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    symbol: 'BTC',
    name: 'Bitcoin',
    networkName: 'Bitcoin',
    precision: 8,
    color: '#FF9800',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoin/info/logo.png',
    explorer: 'https://live.blockcypher.com',
    explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    relatedAssetKey: null,
  },
  'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c': {
    assetId: 'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c',
    chainId: 'eip155:1',
    name: 'Inception Restaked ETH on Ethereum',
    precision: 18,
    color: '#D6D1E4',
    icon: 'https://assets.coingecko.com/coins/images/34127/large/inETH.png?1715036464',
    symbol: 'INETH',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    relatedAssetKey: 'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c',
  },
  'eip155:1/erc20:0xeed3ae7b0f8b5b9bb8c035a9941382b1822671cd': {
    assetId: 'eip155:1/erc20:0xeed3ae7b0f8b5b9bb8c035a9941382b1822671cd',
    chainId: 'eip155:1',
    name: 'EveryCoin',
    precision: 12,
    color: '#0483CB',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xEEd3aE7b0F8b5B9BB8C035A9941382B1822671CD/logo.png',
    symbol: 'EVY',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    relatedAssetKey: null,
  },
  'eip155:1/erc20:0xeeda34a377dd0ca676b9511ee1324974fa8d980d': {
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    color: '#FFFFFF',
    icon: undefined,
    icons: [
      'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD9A442856C234a39a81a089C06451EBAa4306a72/logo.png',
      'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0/logo.png',
    ],
    name: 'Curve PUFETH/WSTETH Pool',
    precision: 18,
    symbol: 'pufETHwstE',
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0xeeda34a377dd0ca676b9511ee1324974fa8d980d',
    relatedAssetKey: null,
    isPool: true,
  },
  'eip155:1/erc20:0xeee0fe52299f2de8e2ed5111cd521ab67dcf0faf': {
    assetId: 'eip155:1/erc20:0xeee0fe52299f2de8e2ed5111cd521ab67dcf0faf',
    chainId: 'eip155:1',
    name: 'The QWAN',
    precision: 18,
    color: '#18B6BE',
    icon: 'https://assets.coingecko.com/coins/images/30613/large/qwan.jpg?1696529482',
    symbol: 'QWAN',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    relatedAssetKey: null,
  },
  'eip155:1/erc20:0xeeecd285f60e802ecb6d8d8d37790c887f9a4b33': {
    assetId: 'eip155:1/erc20:0xeeecd285f60e802ecb6d8d8d37790c887f9a4b33',
    chainId: 'eip155:1',
    name: 'Big Tom',
    precision: 9,
    color: '#27DD08',
    icon: 'https://assets.coingecko.com/coins/images/38555/large/huyah_%281%29.jpg?1717999187',
    symbol: 'TOM',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    relatedAssetKey: null,
  },
  'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f': {
    assetId: 'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f',
    chainId: 'eip155:1',
    name: 'Forgotten Playland',
    precision: 18,
    color: '#35355D',
    icon: 'https://assets.coingecko.com/coins/images/35339/large/200.png?1708515043',
    symbol: 'FP',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
    relatedAssetKey: null,
  },
}

// Order of these is deliberately shuffled to test sorting is preserved
const mockSortedAssetIds = [
  'eip155:1/erc20:0xeeecd285f60e802ecb6d8d8d37790c887f9a4b33', // big tom
  'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f', // forgotten playland
  'eip155:1/erc20:0xeed3ae7b0f8b5b9bb8c035a9941382b1822671cd', // everycoin
  'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c', // Inception Restaked ETH on Ethereum
  'eip155:1/erc20:0xeee0fe52299f2de8e2ed5111cd521ab67dcf0faf', // the qwan
  'eip155:1/erc20:0xeeda34a377dd0ca676b9511ee1324974fa8d980d', // Curve PUFETH/WSTETH Pool
  'bip122:000000000019d6689c085ae165831e93/slip44:0', // BTC
]

describe('assetData', () => {
  it('can encode and decode asset data as a complete round trip', () => {
    const encodedAssetData = encodeAssetData(mockSortedAssetIds, mockGeneratedAssetData)
    const { assetData, sortedAssetIds } = decodeAssetData(encodedAssetData)
    expect(assetData).toEqual(mockGeneratedAssetData)
    expect(sortedAssetIds).toEqual(mockSortedAssetIds)
  })

  it('reconciles against full dataset', () => {
    const generatedAssetsPath = path.join(
      __dirname,
      '../../../../src/lib/asset-service/service/generatedAssetData.json',
    )

    const removeUndefined = (obj: object) => JSON.parse(JSON.stringify(obj))

    const generatedAssetData = JSON.parse(fs.readFileSync(generatedAssetsPath, 'utf8'))
    const assetIds = Object.keys(generatedAssetData).sort()
    const encodedAssetData = encodeAssetData(assetIds, generatedAssetData)

    fs.writeFileSync(
      path.join(
        __dirname,
        '../../../../src/lib/asset-service/service/generatedAssetData_smol.json',
      ),
      JSON.stringify(encodedAssetData),
    )
    console.time('decodeAssetData')
    const { assetData, sortedAssetIds } = decodeAssetData(encodedAssetData)
    console.timeEnd('decodeAssetData')
    Object.entries(generatedAssetData).forEach(([assetId, expectedAsset]) => {
      const actualAsset = assetData[assetId]
      expect(removeUndefined(actualAsset)).toEqual(expectedAsset)
    })
    expect(sortedAssetIds).toEqual(assetIds)
  })
})
