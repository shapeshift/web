import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { bnOrZero, osmosis } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { SymbolDenomMapping } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import {
  buildTradeTx,
  performIbcTransfer,
  pollForComplete,
  symbolDenomMapping,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { atomOnOsmosisAssetId, COSMO_OSMO_CHANNEL, OSMO_COSMO_CHANNEL } from './utils/constants'
import type { OsmosisSupportedChainId } from './utils/types'

const tradeQuoteMetadata: Map<string, { chainId: OsmosisSupportedChainId }> = new Map()

export const osmosisApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input, { sellAssetUsdRate })

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()
      // TODO(gomes): getTradeQuote() is currently a hack, which represents the swap as a single trade, and needs to be revamped
      // This effectively means that getUnsignedTx() won't be able to be implemented for all steps, but only the first for now
      // i.e either the IBC transfer or swap-exact-amount-in
      tradeQuoteMetadata.set(id, {
        chainId: tradeQuote.steps[0].sellAsset.chainId as OsmosisSupportedChainId,
      })
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({
    from,
    tradeQuote,
    stepIndex,
  }: GetUnsignedTxArgs): Promise<CosmosSignTx> => {
    const {
      accountNumber,
      buyAsset,
      sellAsset,
      buyAmountBeforeFeesCryptoBaseUnit,
      sellAmountBeforeFeesCryptoBaseUnit,
    } = tradeQuote.steps[stepIndex]
    const { receiveAddress } = tradeQuote

    const buyAssetIsOnOsmosisNetwork = buyAsset.chainId === osmosisChainId
    const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId

    const sellAssetDenom = symbolDenomMapping[sellAsset.symbol as keyof SymbolDenomMapping]
    const buyAssetDenom = symbolDenomMapping[buyAsset.symbol as keyof SymbolDenomMapping]

    const adapterManager = getChainAdapterManager()
    const osmosisAdapter = adapterManager.get(osmosisChainId) as osmosis.ChainAdapter | undefined
    const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

    const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl, REACT_APP_COSMOS_NODE_URL: cosmosUrl } =
      getConfig()

    if (!cosmosAdapter || !osmosisAdapter) throw new Error('Failed to get adapters')

    let sellAddress
    let cosmosIbcTradeId = ''

    if (sellAssetIsOnOsmosisNetwork) {
      sellAddress = await osmosisAdapter.getAddress({ wallet, accountNumber })

      if (!sellAddress)
        throw new SwapError('failed to get osmoAddress', {
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
        })
    } else {
      /** If the sell asset is not on the Osmosis network, we need to bridge the
       * asset to the Osmosis network first in order to perform a swap on Osmosis DEX.
       */
      sellAddress = await cosmosAdapter.getAddress({ wallet, accountNumber })

      if (!sellAddress) throw new Error('Failed to get address')

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        amount: sellAmountBeforeFeesCryptoBaseUnit,
      }

      const responseAccount = await cosmosAdapter.getAccount(sellAddress)
      const ibcAccountNumber = parseInt(responseAccount.chainSpecific.accountNumber || '0')

      const sequence = responseAccount.chainSpecific.sequence || '0'

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const ibcFromCosmosFeeData = await cosmosAdapter.getFeeData(getFeeDataInput)

      const { tradeId } = await performIbcTransfer(
        transfer,
        cosmosAdapter,
        wallet,
        osmoUrl,
        'uatom',
        COSMO_OSMO_CHANNEL,
        ibcFromCosmosFeeData.fast.txFee,
        accountNumber,
        ibcAccountNumber,
        sequence,
        ibcFromCosmosFeeData.fast.chainSpecific.gasLimit,
        'uatom',
      )

      cosmosIbcTradeId = tradeId

      // wait till confirmed
      const pollResult = await pollForComplete(tradeId, cosmosUrl)
      if (pollResult !== 'success') throw new Error('ibc transfer failed')

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    /** Execute the swap on Osmosis DEX */
    const osmoAddress = sellAssetIsOnOsmosisNetwork ? sellAddress : receiveAddress
    const cosmosAddress = sellAssetIsOnOsmosisNetwork ? receiveAddress : sellAddress

    /** At the current time, only OSMO<->ATOM swaps are supported, so this is fine.
     * In the future, as more Osmosis network assets are added, the buy asset should
     * be used as the fee asset automatically. See the whitelist of supported fee assets here:
     * https://github.com/osmosis-labs/osmosis/blob/04026675f75ca065fb89f965ab2d33c9840c965a/app/upgrades/v5/whitelist_feetokens.go
     */

    const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
    const swapFeeData = await (sellAssetIsOnOsmosisNetwork
      ? osmosisAdapter.getFeeData(getFeeDataInput)
      : cosmosAdapter.getFeeData(getFeeDataInput))

    const feeDenom = sellAssetIsOnOsmosisNetwork
      ? 'uosmo'
      : atomOnOsmosisAssetId.split('/')[1].replace(/:/g, '/')

    // The actual amount that will end up on the IBC channel is the sell amount minus the fee for the IBC transfer Tx
    // We need to deduct the fees from the initial amount in case we're dealing with an IBC transfer + swap flow
    // or else, this will break for swaps to an Osmosis address that doesn't yet have ATOM
    const sellAmountAfterFeesCryptoBaseUnit = sellAssetIsOnOsmosisNetwork
      ? sellAmountBeforeFeesCryptoBaseUnit
      : bnOrZero(sellAmountBeforeFeesCryptoBaseUnit).minus(swapFeeData.fast.txFee).toString()

    // TODO(gomes): this is temporary while we plumb things through, this won't work for cross-account trades
    // We shouldn't have a notion of an accountNumber once we hit the new Osmosis swapper endpoints
    //
    const receiveAccountNumber = accountNumber

    const signTxInput = await buildTradeTx({
      osmoAddress,
      accountNumber: sellAssetIsOnOsmosisNetwork ? accountNumber : receiveAccountNumber,
      adapter: osmosisAdapter,
      buyAssetDenom,
      sellAssetDenom,
      sellAmount: sellAmountAfterFeesCryptoBaseUnit,
      gas: swapFeeData.fast.chainSpecific.gasLimit,
      feeAmount: swapFeeData.fast.txFee,
      feeDenom,
      wallet,
    })

    const signed = await osmosisAdapter.signTransaction(signTxInput)

    // TODO(gomes): anything broadcasty after this line doesn't belong here - all the first/second hop logic should be moved to getTradeQuote() above,
    // so that this method does what it says on the box - gets an unsigned Tx for one hop
    const tradeId = await osmosisAdapter.broadcastTransaction(signed)

    const pollResult = await pollForComplete(tradeId, osmoUrl)
    if (pollResult !== 'success') throw new Error('osmo swap failed')

    if (!buyAssetIsOnOsmosisNetwork) {
      /** If the buy asset is not on the Osmosis Network, we need to bridge the
       * asset from the Osmosis network to the buy asset network.
       */

      const transfer = {
        sender: sellAddress,
        receiver: receiveAddress,
        // IBC transfers are cheap compared to actual swaps, so we can rely on the slow "swap" tx fee
        amount: bnOrZero(buyAmountBeforeFeesCryptoBaseUnit)
          .minus(swapFeeData.slow.txFee)
          .toString(),
      }

      const ibcResponseAccount = await osmosisAdapter.getAccount(sellAddress)
      const ibcAccountNumber = Number(ibcResponseAccount.chainSpecific.accountNumber)
      const ibcSequence = ibcResponseAccount.chainSpecific.sequence || '0'

      // delay to ensure all nodes we interact with are up to date at this point
      // seeing intermittent bugs that suggest the balances and sequence numbers were sometimes off
      await new Promise(resolve => setTimeout(resolve, 5000))

      const cosmosTxHistory = await cosmosAdapter.getTxHistory({
        pubkey: cosmosAddress,
        pageSize: 1,
      })

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
      const ibcFromOsmosisFeeData = await osmosisAdapter.getFeeData(getFeeDataInput)

      await performIbcTransfer(
        transfer,
        osmosisAdapter,
        wallet,
        cosmosUrl,
        buyAssetDenom,
        OSMO_COSMO_CHANNEL,
        osmosis.MIN_FEE,
        accountNumber,
        ibcAccountNumber,
        ibcSequence,
        ibcFromOsmosisFeeData.fast.chainSpecific.gasLimit,
        'uosmo',
      )
      return Ok({
        tradeId,
        previousCosmosTxid: cosmosTxHistory.transactions[0]?.txid,
        cosmosAddress,
      })
    }

    return Ok({ tradeId, previousCosmosTxid: sellAssetIsOnOsmosisNetwork ? '' : cosmosIbcTradeId })

    // TODO(gomes): we may need some additional properties here for Osmosis - or we may not?
    // const buildSendApiTxInput = {
    // value,
    // to,
    // from: from!,
    // chainSpecific: {
    // gasPrice,
    // gasLimit: gas,
    // maxFeePerGas: undefined,
    // maxPriorityFeePerGas: undefined,
    // data,
    // },
    // accountNumber,
    // }
    // return adapter.buildSendApiTransaction(buildSendApiTxInput)
  },

  checkTradeStatus: async ({
    txHash,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    // TODO(gomes): implement me
  },
}
