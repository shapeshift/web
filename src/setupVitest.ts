import 'module-alias/register'

import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import indexeddb from 'fake-indexeddb'
import moduleAlias from 'module-alias'
import path from 'path'
import { beforeAll, vi } from 'vitest'

import { bitcoin, ethereum, usdc } from '@/test/mocks/assets'

globalThis.indexedDB = indexeddb

const usdcAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

// Redirect 'ethers' imports to 'ethers5' only for specific modules
moduleAlias.addAlias('ethers', (fromPath: string) => {
  const regex = /@shapeshiftoss\/hdwallet-(trezor|ledger|shapeshift-multichain)/
  if (regex.test(fromPath)) return path.resolve(__dirname, '../node_modules/ethers5')
  return 'ethers'
})

vi.hoisted(() => {
  vi.stubEnv('VITE_FEATURE_MIXPANEL', 'false')
})

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true

  // Global fetch stub for AssetService
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('asset-manifest.json')) {
        return Promise.resolve({
          json: () => Promise.resolve({ assetData: 'test', relatedAssetIndex: 'test' }),
        } as Response)
      }
      if (url.includes('generatedAssetData.json')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              byId: {
                [btcAssetId]: bitcoin,
                [ethAssetId]: ethereum,
                [usdcAssetId]: usdc,
              },
              ids: [btcAssetId, ethAssetId, usdcAssetId],
            }),
        } as Response)
      }
      if (url.includes('relatedAssetIndex.json')) {
        return Promise.resolve({
          json: () => Promise.resolve({}),
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    }),
  )
})
vi.resetModules()
vi.mock('ethers')
vi.mock('@shapeshiftoss/hdwallet-ledger', () => ({
  isLedger: vi.fn().mockReturnValue(false),
}))
