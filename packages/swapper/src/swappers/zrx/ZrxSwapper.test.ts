import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes, GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { ZrxError } from '../..'
import { ZrxSwapper } from '..'
import { ZrxBuildQuoteTx } from '../zrx/ZrxBuildQuoteTx/ZrxBuildQuoteTx'
import { getZrxMinMax } from './getZrxMinMax/getZrxMinMax'
import { getZrxQuote } from './getZrxQuote/getZrxQuote'
import { getZrxSendMaxAmount } from './getZrxSendMaxAmount/getZrxSendMaxAmount'
import { getUsdRate } from './utils/helpers/helpers'
import { BTC, FOX, WETH } from './utils/test-data/assets'
import { setupQuote } from './utils/test-data/setupSwapQuote'
import { ZrxApprovalNeeded } from './ZrxApprovalNeeded/ZrxApprovalNeeded'
import { ZrxApproveInfinite } from './ZrxApproveInfinite/ZrxApproveInfinite'
import { ZrxExecuteQuote } from './ZrxExecuteQuote/ZrxExecuteQuote'

jest.mock('./utils/helpers/helpers')
jest.mock('../zrx/ZrxExecuteQuote/ZrxExecuteQuote', () => ({
  ZrxExecuteQuote: jest.fn()
}))

jest.mock('../zrx/ZrxBuildQuoteTx/ZrxBuildQuoteTx', () => ({
  ZrxBuildQuoteTx: jest.fn()
}))

jest.mock('./getZrxQuote/getZrxQuote', () => ({
  getZrxQuote: jest.fn()
}))

jest.mock('./getZrxMinMax/getZrxMinMax', () => ({
  getZrxMinMax: jest.fn()
}))

jest.mock('./ZrxApprovalNeeded/ZrxApprovalNeeded', () => ({
  ZrxApprovalNeeded: jest.fn()
}))

jest.mock('./ZrxApproveInfinite/ZrxApproveInfinite', () => ({
  ZrxApproveInfinite: jest.fn()
}))

jest.mock('./getZrxSendMaxAmount/getZrxSendMaxAmount', () => ({
  getZrxSendMaxAmount: jest.fn()
}))

describe('ZrxSwapper', () => {
  const input = <GetQuoteInput>{}
  const quote = <Quote<ChainTypes, SwapperType>>{}
  const wallet = <HDWallet>{}
  const web3 = <Web3>{}
  const adapterManager = <ChainAdapterManager>{}
  const zrxSwapperDeps = { web3, adapterManager }

  it('calls getZrxQuote on getQuote', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await swapper.getQuote(quoteInput)
    expect(getZrxQuote).toHaveBeenCalled()
  })
  it('returns Zrx type', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const type = swapper.getType()
    expect(type).toBe(SwapperType.Zrx)
  })
  it('handles ZrxError message', () => {
    const message = 'test error'
    const error = new ZrxError(message)
    expect(error.message).toBe(`ZrxError:${message}`)
  })
  it('getAvailableAssets filters out all non-ethereum assets', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const availableAssets = swapper.getAvailableAssets([BTC, FOX, WETH])
    expect(availableAssets).toStrictEqual([FOX, WETH])
  })
  it('canTradePair fails on non-eth chains', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const canTradePair = swapper.canTradePair(BTC, WETH)
    expect(canTradePair).toBeFalsy()
  })
  it('canTradePair succeeds on eth chains', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const canTradePair = swapper.canTradePair(FOX, WETH)
    expect(canTradePair).toBeTruthy()
  })
  it('calls ZrxBuildQuoteTx on swapper.buildQuoteTx', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { input, wallet }
    await swapper.buildQuoteTx(args)
    expect(ZrxBuildQuoteTx).toHaveBeenCalled()
  })
  it('calls ZrxExecuteQuote on swapper.executeQuote', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { quote, wallet }
    await swapper.executeQuote(args)
    expect(ZrxExecuteQuote).toHaveBeenCalled()
  })
  it('gets default pair', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const pair = swapper.getDefaultPair()
    expect(pair).toHaveLength(2)
    pair.forEach((asset) => {
      expect(asset.chain).toBe(ChainTypes.Ethereum)
    })
  })
  it('calls getUsdRate on swapper.getUsdRate', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await swapper.getUsdRate(FOX)
    expect(getUsdRate).toHaveBeenCalled()
  })
  it('calls getZrxMinMax on swapper.getMinMax', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { quoteInput } = setupQuote()
    await swapper.getMinMax(quoteInput)
    expect(getZrxMinMax).toHaveBeenCalled()
  })

  it('calls ZrxApprovalNeeded on swapper.approvalNeeded', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { quoteInput } = setupQuote()
    const args = { quote: quoteInput, wallet }
    await swapper.approvalNeeded(args)
    expect(ZrxApprovalNeeded).toHaveBeenCalled()
  })

  it('calls ZrxApproveInfinite on swapper.approveInfinite', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { quote, wallet }
    await swapper.approveInfinite(args)
    expect(ZrxApproveInfinite).toHaveBeenCalled()
  })

  it('calls getZrxSendMaxAmount on swapper.getSendMaxAmount', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = {
      quote,
      wallet,
      sellAssetAccountId: '0',
      feeEstimateKey: chainAdapters.FeeDataKey.Average
    }
    await swapper.getSendMaxAmount(args)
    expect(getZrxSendMaxAmount).toHaveBeenCalled()
  })
})
