import 'module-alias/register'

import { btcAssetId, ethAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import type axios from 'axios'
import indexeddb from 'fake-indexeddb'
import moduleAlias from 'module-alias'
import path from 'path'
import { beforeAll, vi } from 'vitest'

import { bitcoin, ethereum, usdc } from '@/test/mocks/assets'

globalThis.indexedDB = indexeddb

// Redirect 'ethers' imports to 'ethers5' only for specific modules
moduleAlias.addAlias('ethers', (fromPath: string) => {
  const regex = /@shapeshiftoss\/hdwallet-(trezor|ledger|shapeshift-multichain)/
  if (regex.test(fromPath)) return path.resolve(__dirname, '../node_modules/ethers5')
  return 'ethers'
})

// Hoisted mock data for use in vi.mock factories
const hoistedMockData = vi.hoisted(() => ({
  assetData: {
    byId: {
      'bip122:000000000019d6689c085ae165831e93/slip44:0': {
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        symbol: 'BTC',
        name: 'Bitcoin',
        precision: 8,
        color: '#FF9800',
        icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
        relatedAssetKey: null,
      },
      'eip155:1/slip44:60': {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        symbol: 'ETH',
        name: 'Ethereum',
        precision: 18,
        color: '#FFFFFF',
        icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
        relatedAssetKey: null,
      },
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 'eip155:1',
        symbol: 'USDC',
        name: 'USD Coin',
        precision: 6,
        color: '#2775CA',
        icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        relatedAssetKey: null,
      },
    },
    ids: [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'eip155:1/slip44:60',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ],
  },
  relatedAssetIndex: {},
}))

vi.hoisted(() => {
  vi.stubEnv('VITE_FEATURE_MIXPANEL', 'false')
})

// Mock asset data for axios requests (used by AssetService)
export const mockAssetData = {
  byId: {
    [btcAssetId]: bitcoin,
    [ethAssetId]: ethereum,
    [usdcAssetId]: usdc,
  },
  ids: [btcAssetId, ethAssetId, usdcAssetId],
}

export const mockRelatedAssetIndex = {}

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true
})
vi.resetModules()
vi.mock('ethers')
vi.mock('@shapeshiftoss/hdwallet-ledger', () => ({
  isLedger: vi.fn().mockReturnValue(false),
}))

// Global axios mock for AssetService - can be overridden by individual test files
vi.mock('axios', async importOriginal => {
  const actual = await importOriginal<typeof axios>()
  return {
    ...actual,
    default: {
      ...actual,
      get: vi.fn((url: string) => {
        if (url.includes('asset-manifest.json')) {
          return Promise.resolve({ data: { assetData: 'test', relatedAssetIndex: 'test' } })
        }
        if (url.includes('generatedAssetData.json')) {
          return Promise.resolve({ data: hoistedMockData.assetData })
        }
        if (url.includes('relatedAssetIndex.json')) {
          return Promise.resolve({ data: hoistedMockData.relatedAssetIndex })
        }
        // Return empty for other URLs - tests should mock their own responses
        return Promise.resolve({ data: {} })
      }),
    },
  }
})
