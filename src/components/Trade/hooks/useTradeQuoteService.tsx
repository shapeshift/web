import { skipToken } from '@reduxjs/toolkit/query'
import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { type GetTradeQuoteInput, type UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
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
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAccountSpecifiers,
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountMetadata: AccountMetadata
  wallet: HDWallet
  receiveAddress: NonNullable<TS['receiveAddress']>
  sellAmount: string
}

export const getTradeQuoteArgs = async ({
  sellAsset,
  buyAsset,
  sellAccountMetadata,
  wallet,
  receiveAddress,
  sellAmount,
}: GetTradeQuoteInputArgs) => {
  if (!sellAsset || !buyAsset) return undefined
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmount: toBaseUnit(sellAmount, sellAsset?.precision || 0),
    sellAsset,
    buyAsset,
    sendMax: false,
    receiveAddress,
  }
  if (isSupportedNonUtxoSwappingChain(sellAsset?.chainId)) {
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountMetadata?.bip44Params,
    }
  } else if (isSupportedUtxoSwappingChain(sellAsset?.chainId) && sellAccountMetadata) {
    if (!sellAccountMetadata?.accountType) throw new Error('no accountType')
    const sellAssetChainAdapter = getChainAdapterManager().get(
      sellAsset.chainId,
    ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
    const { xpub } = await sellAssetChainAdapter.getPublicKey(
      wallet,
      sellAccountMetadata?.bip44Params,
      sellAccountMetadata?.accountType,
    )
    return {
      ...tradeQuoteInputCommonArgs,
      chainId: sellAsset.chainId,
      bip44Params: sellAccountMetadata.bip44Params,
      accountType: sellAccountMetadata.accountType,
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
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

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
    const sellTradeAssetAmount = sellTradeAsset?.amount
    if (
      sellAsset &&
      sellAssetAccountId &&
      buyAsset &&
      wallet &&
      sellTradeAssetAmount &&
      receiveAddress
    ) {
      ;(async () => {
        const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
        const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

        if (!chainAdapter)
          throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountMetadata,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmount: sellTradeAssetAmount,
        })
        tradeQuoteInputArgs && setTradeQuoteArgs(tradeQuoteInputArgs)
      })()
    }
  }, [
    accountSpecifiersList,
    action,
    amount,
    buyAsset,
    buyTradeAsset,
    receiveAddress,
    selectedCurrencyToUsdRate,
    sellAccountMetadata,
    sellAsset,
    sellAssetAccountId,
    sellTradeAsset,
    setValue,
    wallet,
  ])

  // Set trade quote
  useEffect(() => {
    tradeQuote && setValue('quote', tradeQuote)
  }, [tradeQuote, setValue])

  return { isLoadingTradeQuote }
}
