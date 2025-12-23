import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { getAffiliateBps } from './utils'

describe('getAffiliateBps', () => {
  const ethAsset: Asset = {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    relatedAssetKey: null,
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
  }

  const arbEthAsset: Asset = {
    assetId: 'eip155:42161/slip44:60',
    chainId: 'eip155:42161',
    relatedAssetKey: 'eip155:1/slip44:60',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    explorerAddressLink: 'https://arbiscan.io/address/',
    explorerTxLink: 'https://arbiscan.io/tx/',
  }

  const usdcEthAsset: Asset = {
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: 'eip155:1',
    relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    name: 'USD Coin',
    precision: 6,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/usdc@2x.png',
    symbol: 'USDC',
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/',
  }

  const usdcBaseAsset: Asset = {
    assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    chainId: 'eip155:8453',
    relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    name: 'USD Coin',
    precision: 6,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/usdc@2x.png',
    symbol: 'USDC',
    explorer: 'https://basescan.org',
    explorerAddressLink: 'https://basescan.org/address/',
    explorerTxLink: 'https://basescan.org/tx/',
  }

  const btcAsset: Asset = {
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    relatedAssetKey: null,
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    symbol: 'BTC',
    explorer: 'https://blockchain.info',
    explorerAddressLink: 'https://blockchain.info/address/',
    explorerTxLink: 'https://blockchain.info/tx/',
  }

  it('should return 0 for related assets with same relatedAssetKey', () => {
    expect(getAffiliateBps(usdcEthAsset, usdcBaseAsset)).toBe('0')
  })

  it('should return 0 for parent asset to child asset', () => {
    expect(getAffiliateBps(ethAsset, arbEthAsset)).toBe('0')
  })

  it('should return 0 for child asset to parent asset', () => {
    expect(getAffiliateBps(arbEthAsset, ethAsset)).toBe('0')
  })

  it('should return default fee for unrelated assets', () => {
    expect(getAffiliateBps(ethAsset, btcAsset)).toBe('55')
  })
})
