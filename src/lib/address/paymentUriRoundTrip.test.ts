import type { Asset } from '@shapeshiftoss/types'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { parseUrlDirect } from './bip21'
import { generateReceiveQrText } from './generateReceiveQrText'

import { getAssetService, initAssetService } from '@/lib/asset-service'
import {
  base,
  bitcoin,
  cosmos,
  dogecoin,
  ethereum,
  litecoin,
  solana,
  thorchain,
  usdc,
} from '@/test/mocks/assets'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { store } from '@/state/store'
import { mockChainAdapters } from '@/test/mocks/portfolio'

beforeAll(async () => {
  await initAssetService()
  const service = getAssetService()
  // The mocks on top, so parsing can resolve the fee assets the round trip asserts amounts against
  const mocks = [base, bitcoin, cosmos, dogecoin, ethereum, litecoin, solana, thorchain, usdc]
  store.dispatch(
    assets.actions.upsertAssets({
      byId: {
        ...service.assetsById,
        ...Object.fromEntries(mocks.map(asset => [asset.assetId, asset])),
      },
      ids: [...service.assetIds, ...mocks.map(asset => asset.assetId)],
    }),
  )
})

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

/**
 * Our builder is hand-rolled; bip21, eth-url-parser and @solana/pay do the parsing here, and they
 * are what wallets are built on. Surviving the round trip is the closest we get to a scan without
 * a camera.
 */
describe('payment uri round trip', () => {
  const cases: { name: string; asset: Asset; address: string; amount: string }[] = [
    {
      name: 'bitcoin',
      asset: bitcoin,
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      amount: '0.05',
    },
    {
      name: 'dogecoin',
      asset: dogecoin,
      address: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
      amount: '100.5',
    },
    {
      name: 'litecoin',
      asset: litecoin,
      address: 'ltc1qgtoenzhtqfnzhqjqagsvpwzs4x0dfmrqvhlpaf',
      amount: '2.5',
    },
    {
      name: 'cosmos',
      asset: cosmos,
      address: 'cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3',
      amount: '12.345',
    },
    {
      name: 'thorchain',
      asset: thorchain,
      address: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37nrytwp2',
      amount: '7',
    },
    {
      name: 'ethereum',
      asset: ethereum,
      address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      amount: '1.25',
    },
    {
      name: 'base eth',
      asset: base,
      address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      amount: '0.001',
    },
    {
      name: 'usdc erc20',
      asset: usdc,
      address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      amount: '250.123456',
    },
    {
      name: 'solana',
      asset: solana,
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      amount: '3.5',
    },
  ]

  it.each(cases)('survives a $name build and parse', ({ asset, address, amount }) => {
    const uri = generateReceiveQrText({
      receiveAddress: address,
      asset,
      amountCryptoPrecision: amount,
    })

    const parsed = parseUrlDirect(uri)

    expect(parsed).not.toBeNull()
    expect(parsed?.chainId).toBe(asset.chainId)
    expect(parsed?.maybeAddress).toBe(address)
    expect(parsed?.amountCryptoPrecision).toBe(amount)
    expect(parsed?.assetId).toBe(asset.assetId)
  })
})
