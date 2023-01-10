import { btcAssetId } from '@shapeshiftoss/caip'
import { getInboundAddressDataForChain, SwapperName } from '@shapeshiftoss/swapper'
import { isTradingActive } from 'components/Trade/utils'

jest.mock('@shapeshiftoss/swapper', () => ({
  ...jest.requireActual('@shapeshiftoss/swapper'),
  getInboundAddressDataForChain: jest.fn(),
}))

describe('isTradingActive', () => {
  it('detects an active pool from a valid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce({ halted: false })

    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse).toBe(true)
  })

  it('detects an halted pool from a valid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce({ halted: true })
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse).toBe(false)
  })

  it('assumes a halted pool on invalid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce(undefined)
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.Thorchain)
    expect(isTradingActiveResponse).toBe(false)
  })

  it('does not look for halted flags unless the SwapperName is Thorchain', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce({ halted: true })
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperName.CowSwap)
    expect(isTradingActiveResponse).toBe(true)
  })
})
