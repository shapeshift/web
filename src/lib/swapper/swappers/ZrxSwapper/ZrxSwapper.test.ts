import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

import { setupBuildTrade, setupQuote } from '../utils/test-data/setupSwapQuote'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { setupExecuteTrade } from './utils/test-data/setupZrxSwapQuote'
import { zrxBuildTrade } from './zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from './zrxExecuteTrade/zrxExecuteTrade'
import { ZrxSwapper } from './ZrxSwapper'

jest.mock('./utils/helpers/helpers')
jest.mock('lib/swapper/swappers/ZrxSwapper/zrxExecuteTrade/zrxExecuteTrade', () => ({
  zrxExecuteTrade: jest.fn(),
}))

jest.mock('lib/swapper/swappers/ZrxSwapper/zrxBuildTrade/zrxBuildTrade', () => ({
  zrxBuildTrade: jest.fn(),
}))

jest.mock('./getZrxTradeQuote/getZrxTradeQuote', () => ({
  getZrxTradeQuote: jest.fn(),
}))

jest.mock('./getMinimumAmountCryptoHuman/getMinimumAmountCryptoHuman', () => ({
  getMinimumAmountCryptoHuman: jest.fn(),
}))

describe('ZrxSwapper', () => {
  const wallet = {} as HDWallet

  it('calls getZrxTradeQuote on getTradeQuote', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper()
    await swapper.getTradeQuote(quoteInput)
    expect(getZrxTradeQuote).toHaveBeenCalled()
  })
  it('returns 0x name', () => {
    const swapper = new ZrxSwapper()
    expect(swapper.name).toBe('0x')
  })
  it('calls zrxBuildTrade on swapper.buildQuoteTx', async () => {
    const { buildTradeInput } = setupBuildTrade()
    const swapper = new ZrxSwapper()
    await swapper.buildTrade(buildTradeInput)
    expect(zrxBuildTrade).toHaveBeenCalled()
  })
  it('calls ZrxExecuteTrade on swapper.executeTrade', async () => {
    const { executeTradeInput } = setupExecuteTrade()
    const swapper = new ZrxSwapper()
    const args = { trade: executeTradeInput, wallet }
    await swapper.executeTrade(args)
    expect(zrxExecuteTrade).toHaveBeenCalled()
  })
})
