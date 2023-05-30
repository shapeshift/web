import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import type {
  BuyAssetBySellIdInput,
  SwapErrorRight,
  Swapper,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

/**
 * Playground for testing different scenarios of multiple swappers in the manager.
 * Meant for local testing only
 */
export class TestSwapper implements Swapper<ChainId> {
  readonly name = SwapperName.Test
  supportAssets: string[]

  // noop for test
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async initialize() {
    const res = await Promise.resolve(undefined)
    return Ok(res)
  }

  constructor() {
    this.supportAssets = [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'cosmos:cosmoshub-4/slip44:118',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    ]
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { sellAssetId } = args
    if (!this.supportAssets.includes(sellAssetId)) return []
    return this.supportAssets
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportAssets
  }

  buildTrade(): Promise<Result<Trade<ChainId>, SwapErrorRight>> {
    throw new Error('TestSwapper: buildTrade unimplemented')
  }

  getTradeQuote(): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>> {
    throw new Error('TestSwapper: getTradeQuote unimplemented')
  }

  executeTrade(): Promise<Result<TradeResult, SwapErrorRight>> {
    throw new Error('TestSwapper: executeTrade unimplemented')
  }

  getTradeTxs(): Promise<Result<TradeTxs, SwapErrorRight>> {
    throw new Error('TestSwapper: executeTrade unimplemented')
  }
}
