import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, GetQuoteInput, Quote, SwapperType } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { ZrxError } from '../..'
import { ZrxSwapper } from '..'
import { buildQuoteTx } from '../zrx/buildQuoteTx/buildQuoteTx'
import { executeQuote } from '../zrx/executeQuote/executeQuote'
import { approvalNeeded } from './approvalNeeded/approvalNeeded'
import { approveInfinite } from './approveInfinite/approveInfinite'
import { getMinMax } from './getMinMax/getMinMax'
import { getZrxQuote } from './getQuote/getQuote'
import { getUsdRate } from './utils/helpers/helpers'
import { BTC, FOX, WETH } from './utils/test-data/assets'
import { setupQuote } from './utils/test-data/setupSwapQuote'

jest.mock('./utils/helpers/helpers')
jest.mock('../zrx/executeQuote/executeQuote', () => ({
  executeQuote: jest.fn()
}))

jest.mock('../zrx/buildQuoteTx/buildQuoteTx', () => ({
  buildQuoteTx: jest.fn()
}))

jest.mock('./getQuote/getQuote', () => ({
  getZrxQuote: jest.fn()
}))

jest.mock('./getMinMax/getMinMax', () => ({
  getMinMax: jest.fn()
}))

jest.mock('./approvalNeeded/approvalNeeded', () => ({
  approvalNeeded: jest.fn()
}))

jest.mock('./approveInfinite/approveInfinite', () => ({
  approveInfinite: jest.fn()
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
  it('calls buildQuoteTx on swapper.buildQuoteTx', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { input, wallet }
    await swapper.buildQuoteTx(args)
    expect(buildQuoteTx).toHaveBeenCalled()
  })
  it('calls executeQuote on swapper.executeQuote', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { quote, wallet }
    await swapper.executeQuote(args)
    expect(executeQuote).toHaveBeenCalled()
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
  it('calls getMinMax on swapper.getMinMax', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { quoteInput } = setupQuote()
    await swapper.getMinMax(quoteInput)
    expect(getMinMax).toHaveBeenCalled()
  })

  it('calls approvalNeeded on swapper.approvalNeeded', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { quoteInput } = setupQuote()
    const args = { quote: quoteInput, wallet }
    await swapper.approvalNeeded(args)
    expect(approvalNeeded).toHaveBeenCalled()
  })

  it('calls approveInfinite on swapper.approveInfinite', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { quote, wallet }
    await swapper.approveInfinite(args)
    expect(approveInfinite).toHaveBeenCalled()
  })
})
