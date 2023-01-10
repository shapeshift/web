import { btcAssetId } from '@shapeshiftoss/caip'
import { getInboundAddressDataForChain, SwapperType } from '@shapeshiftoss/swapper'
import { isTradingActive } from 'components/Trade/utils'

jest.mock('@shapeshiftoss/swapper', () => ({
  ...jest.requireActual('@shapeshiftoss/swapper'),
  getInboundAddressDataForChain: jest.fn(),
}))

describe('isTradingActive', () => {
  it('detects an active chain from a valid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce({ halted: false })

    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperType.Thorchain)
    expect(isTradingActiveResponse).toBe(true)
  })

  it('detects an halted chain from a valid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce({ halted: true })
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperType.Thorchain)
    expect(isTradingActiveResponse).toBe(false)
  })

  it('assumes a halted chain on invalid response', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce(undefined)
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperType.Thorchain)
    expect(isTradingActiveResponse).toBe(false)
  })

  it('does not look for halted flags unless the SwapperType is Thorchain', async () => {
    ;(getInboundAddressDataForChain as jest.Mock).mockResolvedValueOnce({ halted: true })
    const isTradingActiveResponse = await isTradingActive(btcAssetId, SwapperType.CowSwap)
    expect(isTradingActiveResponse).toBe(true)
  })
})
