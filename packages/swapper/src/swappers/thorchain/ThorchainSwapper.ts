import { AssetId } from '@shapeshiftoss/caip'
import { Asset, SupportedChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededOutput,
  GetMinMaxInput,
  MinMaxOutput,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult
} from '../../api'
export class ThorchainSwapper implements Swapper {
  getType() {
    return SwapperType.Thorchain
  }

  // TODO populate supported assets from midgard
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async initialize() {}

  getUsdRate(input: Pick<Asset, 'symbol' | 'assetId'>): Promise<string> {
    console.info(input)
    throw new Error('ThorchainSwapper: getUsdRate unimplemented')
  }

  getMinMax(input: GetMinMaxInput): Promise<MinMaxOutput> {
    console.info(input)
    throw new Error('ThorchainSwapper: getMinMax unimplemented')
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    throw new Error('ThorchainSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(): Promise<string> {
    throw new Error('ThorchainSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(): AssetId[] {
    return []
  }

  filterAssetIdsBySellable(): AssetId[] {
    return []
  }

  async buildTrade(): Promise<Trade<SupportedChainIds>> {
    throw new Error('ThorchainSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(): Promise<TradeQuote<SupportedChainIds>> {
    throw new Error('ThorchainSwapper: getTradeQuote unimplemented')
  }

  async executeTrade(): Promise<TradeResult> {
    throw new Error('ThorchainSwapper: executeTrade unimplemented')
  }
}
