import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote,
  TradeQuote2,
  UnsignedTx,
} from 'lib/swapper/api'
import { getThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import type {
  ThorChainId,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { Rates } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getSignTxFromQuote } from 'lib/swapper/swappers/ThorchainSwapper/utils/getSignTxFromQuote'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

// Gets a from address either
// - derived from the input (for our own consumption with our AccountMetadata and ChainId structures)
// - or simply falls the passed from address through, for external consumers

type WithFromOrXpubParams = {
  chainId?: ChainId
  accountMetadata?: AccountMetadata
  wallet?: HDWallet
  from?: string
  xpub?: string
}

const withFromOrXpub =
  <T, P>(wrappedFunction: (params: P & { from?: string; xpub?: string }) => Promise<T>) =>
  async (params: WithFromOrXpubParams & P): Promise<T> => {
    const { chainId, accountMetadata, wallet, from: inputFrom, xpub: inputXpub } = params

    let from: string | undefined = inputFrom
    let xpub: string | undefined = inputXpub

    if (!from && !xpub) {
      if (!wallet) throw new Error('Wallet required for getAddress and getPublicKey calls')

      const chainAdapterManager = getChainAdapterManager()
      if (!chainId) throw new Error('No chainId provided')
      const adapter = chainAdapterManager.get(chainId) as ChainAdapter<ThorChainId>
      if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)

      const accountNumber = accountMetadata?.bip44Params?.accountNumber
      const accountType = accountMetadata?.accountType

      if (!accountNumber) throw new Error('Account number required')
      if (isUtxoChainId(chainId)) {
        if (!accountType) throw new Error('Account number required')
        xpub = (
          await (adapter as UtxoChainAdapter).getPublicKey(wallet, accountNumber, accountType)
        ).xpub
      } else {
        from = await adapter.getAddress({ wallet, accountNumber })
      }
    }

    return wrappedFunction({ ...params, from, xpub })
  }

export const thorswapperApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    rates: Rates,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getThorTradeQuote(input, rates)

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = String(Date.now()) // TODO: get thorchain quote ID or use uuid

      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },
  // TODO: getUnsignedTx isn't consumed anywhere yet. When it is, move the HOF to the caller, so we keep the inner function pure
  getUnsignedTx: withFromOrXpub(
    async ({
      accountMetadata,
      tradeQuote,
      from,
      xpub,
      supportsEIP1559,
      buyAssetUsdRate,
      feeAssetUsdRate,
    }): Promise<UnsignedTx> => {
      const { receiveAddress, affiliateBps } = tradeQuote
      const accountType = accountMetadata?.accountType

      const chainSpecific =
        accountType && xpub
          ? {
              xpub,
              accountType,
              satoshiPerByte: (tradeQuote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
                .chainSpecific.satsPerByte,
            }
          : undefined

      const fromOrXpub = from ? { from } : { xpub: xpub! }
      return await getSignTxFromQuote({
        tradeQuote,
        receiveAddress,
        affiliateBps,
        chainSpecific,
        buyAssetUsdRate,
        ...fromOrXpub,
        feeAssetUsdRate,
        supportsEIP1559,
      })
    },
  ),

  checkTradeStatus: async (txId: string): Promise<{ isComplete: boolean; message?: string }> => {
    // FIXME: We need another way to achieve this, as importing ThorchainSwapper causes a circular dependency
    return Promise.resolve({ isComplete: true, message: txId })
    // const thorchainSwapper = new ThorchainSwapper()
    // const txsResult = await thorchainSwapper.getTradeTxs({ tradeId: txId })
    // return {
    //   isComplete: txsResult.isOk() && !!txsResult.unwrap().buyTxid,
    // }
  },
}
