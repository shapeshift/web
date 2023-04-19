import { SwapperName, SwapperType, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type {
    ApprovalNeededInput,
    ApprovalNeededOutput,
    ApproveAmountInput,
    ApproveInfiniteInput,
    BuildTradeInput,
    BuyAssetBySellIdInput,
    GetEvmTradeQuoteInput,
    Swapper,
    TradeResult,
    TradeTxs,
  } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { avalanche, bnbsmartchain, ethereum, optimism } from '@shapeshiftoss/chain-adapters'


export type OneInchSupportedChainId =
    | KnownChainIds.EthereumMainnet
    | KnownChainIds.BnbSmartChainMainnet
    | KnownChainIds.OptimismMainnet
    | KnownChainIds.AvalancheMainnet

export type OneInchSupportedChainAdapter =
    | ethereum.ChainAdapter
    | bnbsmartchain.ChainAdapter
    | optimism.ChainAdapter
    | avalanche.ChainAdapter

export class OneInchSwapper<T extends OneInchSupportedChainId> implements Swapper<T> {
    readonly name = SwapperName.OneInch

    /** perform any necessary async initialization */
    async initialize(): Promise<void> {
        // no-op
    }

    /** Returns the swapper type */
    getType(): SwapperType {
        return SwapperType.OneInch
    }

    /**
    * Get a trade quote
    */
    async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>>{
        return await getTradeQuote(input)
    }


    

}