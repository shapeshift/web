import { btcAssetId } from '@shapeshiftoss/caip'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { InboundAddressResponse } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { describe, expect, it, vi } from 'vitest'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'

import { isTradingActive } from './helpers'

vi.mock('lib/utils/thorchain/getInboundAddressDataForChain.ts', async importActual => {
  const actual: typeof getInboundAddressDataForChain = await importActual()

  return {
    ...actual,
    getInboundAddressDataForChain: vi.fn(),
  }
})

describe('isTradingActive', () => {
  it('detects an active pool from a valid response', async () => {
    vi.mocked(getInboundAddressDataForChain).mockResolvedValueOnce(
      Ok({ halted: false }) as unknown as Result<InboundAddressResponse, SwapErrorRight>,
    )

    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse.unwrap()).toBe(true)
  })

  it('detects an halted pool from a valid response', async () => {
    vi.mocked(getInboundAddressDataForChain).mockResolvedValueOnce(
      Ok({ halted: true }) as unknown as Result<InboundAddressResponse, SwapErrorRight>,
    )
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse.unwrap()).toBe(false)
  })

  it('assumes a halted pool on invalid response', async () => {
    vi.mocked(getInboundAddressDataForChain).mockResolvedValueOnce(
      Err(undefined) as unknown as Result<InboundAddressResponse, SwapErrorRight>,
    )
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse.isErr()).toBe(true)
  })

  it('does not look for halted flags unless the SwapperName is Thorchain', async () => {
    vi.mocked(getInboundAddressDataForChain).mockResolvedValueOnce(
      Ok({ halted: true }) as unknown as Result<InboundAddressResponse, SwapErrorRight>,
    )
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.CowSwap)
    expect(isTradingActiveResponse.unwrap()).toBe(true)
  })
})
