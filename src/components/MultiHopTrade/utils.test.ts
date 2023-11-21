import { btcAssetId } from '@shapeshiftoss/caip'
import { Err, Ok } from '@sniptt/monads'
import { isTradingActive } from 'components/MultiHopTrade/utils'
import { SwapperName } from 'lib/swapper/types'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'

jest.mock('lib/utils/thorchain/getInboundAddressDataForChain.ts', () => ({
  ...jest.requireActual('lib/utils/thorchain/getInboundAddressDataForChain.ts'),
  getInboundAddressDataForChain: jest.fn(),
}))

describe('isTradingActive', () => {
  it('detects an active pool from a valid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce(Ok({ halted: false }))

    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse.unwrap()).toBe(true)
  })

  it('detects an halted pool from a valid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce(Ok({ halted: true }))
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse.unwrap()).toBe(false)
  })

  it('assumes a halted pool on invalid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce(Err(undefined))
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse.isErr()).toBe(true)
  })

  it('does not look for halted flags unless the SwapperName is Thorchain', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce(Ok({ halted: true }))
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.CowSwap)
    expect(isTradingActiveResponse.unwrap()).toBe(true)
  })
})
