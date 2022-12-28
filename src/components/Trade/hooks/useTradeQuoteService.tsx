import { skipToken } from '@reduxjs/toolkit/query'
import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { type GetTradeQuoteInput, type UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import {
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import type { TS } from 'components/Trade/types'
import { type TradeQuoteInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { useGetTradeQuoteQuery } from 'state/apis/swapper/swapperApi'
import {
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  sellAccountBip44Params: BIP44Params
  wallet: HDWallet
  receiveAddress: NonNullable<TS['receiveAddress']>
  sellAmountBeforeFeesCryptoPrecision: string
  isSendMax: boolean
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountBip44Params,
  sellAccountType,
  wallet,
  receiveAddress,
  sellAmountBeforeFeesCryptoPrecision,
  isSendMax,
}: GetTradeQuoteInputArgs) => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset?.precision || 0,
    ),
    sellAsset,
    buyAsset,
    sendMax: isSendMax,
    receiveAddress,
  }
  if (isSupportedNonUtxoSwappingChain(sellAsset?.chainId)) {
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountBip44Params,
    }
  } else if (isSupportedUtxoSwappingChain(sellAsset?.chainId)) {
    if (!sellAccountType) return
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
    const { xpub } = await sellAssetChainAdapter.getPublicKey(
      wallet,
      sellAccountBip44Params,
      sellAccountType,
    )
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountBip44Params,
      accountType: sellAccountType,
      xpub,
    }
  }
}

/*
The Trade Quote Service is responsible for reacting to changes to trade assets and updating the quote accordingly.
The only mutation is on TradeState's quote property.
*/
export const useTradeQuoteService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const amount = useWatch({ control, name: 'amount' })
  const action = useWatch({ control, name: 'action' })
  const isSendMax = useWatch({ control, name: 'isSendMax' })
  const quote = useWatch({ control, name: 'quote' })

  // Types
  type TradeQuoteQueryInput = Parameters<typeof useGetTradeQuoteQuery>
  type TradeQuoteInputArg = TradeQuoteQueryInput[0]

  // State
  const {
    state: { wallet },
  } = useWallet()
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<TradeQuoteInputArg>(skipToken)
  const { receiveAddress } = useSwapper()

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, {
      assetId: sellAsset?.assetId ?? '',
    }),
  )
  const sellAccountFilter = { accountId: sellAssetAccountId ?? sellAssetAccountIds[0] }
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  // API
  const { data: tradeQuote, isLoading: isLoadingTradeQuote } = useGetTradeQuoteQuery(
    tradeQuoteArgs,
    { pollingInterval: 30000 },
  )

  // Effects
  // Trigger trade quote query
  useEffect(() => {
    const sellTradeAssetAmountCryptoPrecision = sellTradeAsset?.amountCryptoPrecision
    if (
      sellAsset &&
      buyAsset &&
      wallet &&
      sellTradeAssetAmountCryptoPrecision &&
      receiveAddress &&
      sellAccountMetadata
    ) {
      ;(async () => {
        const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
        const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

        if (!chainAdapter)
          throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountBip44Params: sellAccountMetadata.bip44Params,
          sellAccountType: sellAccountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmountBeforeFeesCryptoPrecision: sellTradeAssetAmountCryptoPrecision,
          isSendMax,
        })
        tradeQuoteInputArgs && setTradeQuoteArgs(tradeQuoteInputArgs)
      })()
    }
  }, [
    action,
    amount,
    buyAsset,
    buyTradeAsset,
    receiveAddress,
    sellAccountMetadata,
    selectedCurrencyToUsdRate,
    sellAsset,
    sellTradeAsset,
    setValue,
    wallet,
    isSendMax,
  ])

  // Update trade quote
  useEffect(() => setValue('quote', tradeQuote), [tradeQuote, setValue])

  // Set slippage if the quote contains a recommended value, else use the default
  useEffect(
    () =>
      setValue(
        'slippage',
        tradeQuote?.recommendedSlippage ? tradeQuote.recommendedSlippage : DEFAULT_SLIPPAGE,
      ),
    [tradeQuote, setValue],
  )

  // Set trade quote if not yet set (e.g. on page load)
  useEffect(() => {
    // Checking that no quote has been set and tradeQuote exists prevents an infinite render
    !quote && tradeQuote && setValue('quote', tradeQuote)
  }, [quote, setValue, tradeQuote])

  return { isLoadingTradeQuote }
}
