import { btcAssetId } from '@shapeshiftoss/caip'
import type { getInboundAddressDataForChain } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { InboundAddressResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { ThorchainChain } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { selectIsTradingActive } from 'react-queries/selectors'
import { describe, expect, it, vi } from 'vitest'

vi.mock('lib/utils/thorchain/getInboundAddressDataForChain.ts', async importActual => {
  const actual: typeof getInboundAddressDataForChain = await importActual()

  return {
    ...actual,
    getInboundAddressDataForChain: vi.fn(),
  }
})

const mockInboundAddressDataBase = {
  address: 'bc1q7sxlrlqmlyrzkr4pstkzg2jnhhcre4ly9gtsk6',
  chain: ThorchainChain.BTC,
  chain_lp_actions_paused: false,
  chain_trading_paused: false,
  dust_threshold: '10000',
  gas_rate: '46',
  gas_rate_units: 'satsperbyte',
  global_trading_paused: false,
  outbound_fee: '46500',
  outbound_tx_size: '1000',
  pub_key: 'thorpub1addwnpepqvy7h72pznr09x0ky2cw85awyeprxekfc787pdwahqv6xfp2qs0qw2s2mpa',
} as InboundAddressResponse

const mockInboundAddressDataActive: InboundAddressResponse = {
  ...mockInboundAddressDataBase,
  halted: false,
}

const mockInboundAddressDataHalted: InboundAddressResponse = {
  ...mockInboundAddressDataBase,
  halted: true,
}

const mockMimirActive = {
  HALTTHORCHAIN: 0,
}

describe('isTradingActive', () => {
  const isTradingActiveResponse = selectIsTradingActive({
    assetId: btcAssetId,
    swapperName: SwapperName.Thorchain,
    inboundAddressResponse: mockInboundAddressDataActive,
    mimir: mockMimirActive,
  })
  expect(isTradingActiveResponse).toBe(true)

  it('detects an halted pool from a valid response', () => {
    const isTradingActiveResponse = selectIsTradingActive({
      assetId: btcAssetId,
      swapperName: SwapperName.Thorchain,
      inboundAddressResponse: mockInboundAddressDataHalted,
      mimir: mockMimirActive,
    })
    expect(isTradingActiveResponse).toBe(false)
  })

  it('assumes a halted pool on invalid response', () => {
    const isTradingActiveResponse = selectIsTradingActive({
      assetId: btcAssetId,
      swapperName: SwapperName.Thorchain,
      inboundAddressResponse: undefined,
      mimir: mockMimirActive,
    })
    expect(isTradingActiveResponse).toBe(false)
  })

  it('does not look for halted flags unless the SwapperName is Thorchain', () => {
    const isTradingActiveResponse = selectIsTradingActive({
      assetId: btcAssetId,
      swapperName: SwapperName.CowSwap,
      inboundAddressResponse: undefined,
      mimir: mockMimirActive,
    })
    expect(isTradingActiveResponse).toBe(true)
  })
})
