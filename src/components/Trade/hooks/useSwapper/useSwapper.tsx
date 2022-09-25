import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter, EvmChainId, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type {
  Swapper,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
  UtxoSupportedChainIds,
} from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorTypes, SwapperManager } from '@shapeshiftoss/swapper'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import type { DisplayFeeData, TradeAmountInputField, TradeAsset, TS } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { useGetUsdRateQuery } from 'state/apis/swapper/swapperApi'
import type { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectFeatureFlags,
  selectFeeAssetById,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { calculateAmounts } from './calculateAmounts'

const debounceTime = 1000

type GetQuoteCommon = {
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  action: TradeAmountInputField
  selectedCurrencyToUsdRate: BigNumber
}

type GetQuoteInput = {
  forceQuote?: boolean
} & GetQuoteCommon

type DebouncedQuoteInput = {
  swapper: Swapper<ChainId>
  wallet: HDWallet
  accountSpecifiersList: AccountSpecifierMap[]
  sellAssetAccountId: string
  sellAssetFiatRate: string
  buyAssetFiatRate: string
  feeAssetFiatRate: string
} & GetQuoteCommon

export const useSwapper = () => {
  const toast = useToast()
  const translate = useTranslate()
  const { setValue, setError, clearErrors } = useFormContext()
  const [
    quote,
    sellTradeAsset,
    buyTradeAsset,
    trade,
    sellAssetAccountId,
    isExactAllowance,
    sellAssetFiatRate,
    buyAssetFiatRate,
    feeAssetFiatRate,
  ] = useWatch({
    name: [
      'quote',
      'sellTradeAsset',
      'buyTradeAsset',
      'trade',
      'sellAssetAccountId',
      'isExactAllowance',
      'sellAssetFiatRate',
      'buyAssetFiatRate',
      'feeAssetFiatRate',
    ],
  }) as [
    TradeQuote<KnownChainIds> & Trade<KnownChainIds>,
    TradeAsset | undefined,
    TradeAsset | undefined,
    Trade<KnownChainIds>,
    TS['sellAssetAccountId'],
    TS['isExactAllowance'],
    TS['sellAssetFiatRate'],
    TS['buyAssetFiatRate'],
    TS['feeAssetFiatRate'],
  ]

  // This will instantiate a manager with no swappers
  // Swappers will be added in the useEffect below
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())

  const flags = useSelector(selectFeatureFlags)

  useEffect(() => {
    ;(async () => {
      flags && setSwapperManager(await getSwapperManager(flags))
    })()
  }, [buyTradeAsset?.asset?.assetId, flags, sellTradeAsset?.asset?.assetId, swapperManager])

  const sellTradeAssetId = sellTradeAsset?.asset?.assetId
  const buyTradeAssetId = buyTradeAsset?.asset?.assetId

  // TODO: rename to sellFeeAsset
  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  )

  const sellAssetFiatRateResponse = useGetUsdRateQuery(
    {
      rateAssetId: sellTradeAssetId!,
      buyAssetId: buyTradeAssetId!,
      sellAssetId: sellTradeAssetId!,
    },
    { skip: !sellTradeAssetId || !buyTradeAssetId },
  )

  const buyAssetFiatRateResponse = useGetUsdRateQuery(
    {
      rateAssetId: buyTradeAssetId!,
      buyAssetId: buyTradeAssetId!,
      sellAssetId: sellTradeAssetId!,
    },
    { skip: !sellTradeAssetId || !buyTradeAssetId },
  )

  const feeAssetFiatRateResponse = useGetUsdRateQuery(
    {
      rateAssetId: feeAsset?.assetId,
      buyAssetId: buyTradeAssetId!,
      sellAssetId: sellTradeAssetId!,
    },
    { skip: !sellTradeAssetId || !buyTradeAssetId || !feeAsset?.assetId },
  )

  useEffect(() => {
    buyAssetFiatRateResponse?.data &&
      setValue('buyAssetFiatRate', buyAssetFiatRateResponse?.data?.usdRate)
    sellAssetFiatRateResponse?.data &&
      setValue('sellAssetFiatRate', sellAssetFiatRateResponse?.data?.usdRate)
    feeAssetFiatRateResponse?.data &&
      setValue('feeAssetFiatRate', feeAssetFiatRateResponse?.data?.usdRate)
  }, [
    setValue,
    buyAssetFiatRateResponse?.data,
    sellAssetFiatRateResponse?.data,
    feeAssetFiatRateResponse?.data,
  ])

  const {
    state: { wallet },
  } = useWallet()

  const filterAssetsByIds = (assets: Asset[], assetIds: string[]) => {
    const assetIdMap = Object.fromEntries(assetIds.map(assetId => [assetId, true]))
    return assets.filter(asset => assetIdMap[asset.assetId])
  }

  const assetIds = useSelector(selectAssetIds)
  const getSupportedSellableAssets = useCallback(
    (assets: Asset[]) => {
      const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
        assetIds,
      })
      return filterAssetsByIds(assets, sellableAssetIds)
    },
    [assetIds, swapperManager],
  )

  const getSupportedBuyAssetsFromSellAsset = useCallback(
    (assets: Asset[]): Asset[] | undefined => {
      const sellAssetId = sellTradeAsset?.asset?.assetId
      const assetIds = assets.map(asset => asset.assetId)
      const supportedBuyAssetIds = sellAssetId
        ? swapperManager.getSupportedBuyAssetIdsFromSellId({
            assetIds,
            sellAssetId,
          })
        : undefined
      return supportedBuyAssetIds ? filterAssetsByIds(assets, supportedBuyAssetIds) : undefined
    },
    [swapperManager, sellTradeAsset],
  )

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      accountId: sellAssetAccountId,
      assetId: sellTradeAsset?.asset?.assetId ?? '',
    }),
  )

  const { showErrorToast } = useErrorHandler()

  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

  const getSendMaxAmount = async ({
    sellAsset,
    feeAsset,
  }: {
    sellAsset: Asset
    buyAsset: Asset
    feeAsset: Asset
  }) => {
    // Only subtract fee if sell asset is the fee asset
    const isFeeAsset = feeAsset.assetId === sellAsset.assetId
    const feeEstimate = bnOrZero(quote?.feeData?.fee)
    // sell asset balance minus expected fee = maxTradeAmount
    // only subtract if sell asset is fee asset
    const maxAmount = fromBaseUnit(
      bnOrZero(sellAssetBalance)
        .minus(isFeeAsset ? feeEstimate : 0)
        .toString(),
      sellAsset.precision,
    )

    setValue('sellTradeAsset.amount', maxAmount)
    return maxAmount
  }

  type SupportedSwappingChains =
    | KnownChainIds.EthereumMainnet
    | KnownChainIds.AvalancheMainnet
    | KnownChainIds.OsmosisMainnet
    | KnownChainIds.CosmosMainnet

  const isSupportedSwappingChain = (chainId: ChainId): chainId is SupportedSwappingChains => {
    return (
      chainId === KnownChainIds.EthereumMainnet ||
      chainId === KnownChainIds.AvalancheMainnet ||
      chainId === KnownChainIds.OsmosisMainnet ||
      chainId === KnownChainIds.CosmosMainnet ||
      chainId === KnownChainIds.ThorchainMainnet
    )
  }

  const updateTrade = async ({
    sellAsset,
    buyAsset,
    amount,
  }: {
    sellAsset: Asset
    buyAsset: Asset
    amount: string
  }): Promise<void> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: buyAsset.assetId,
      sellAssetId: sellAsset.assetId,
    })

    if (!swapper) throw new Error('no swapper available')
    if (!wallet) throw new Error('no wallet available')
    if (!sellAssetAccountId) throw new Error('no sellAssetAccountId available')

    const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
    const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

    if (!chainAdapter) throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

    const state = store.getState()
    const buyAssetAccountIds = selectPortfolioAccountIdsByAssetId(state, {
      assetId: buyAsset?.assetId ?? '',
    })
    const buyAccountFilter = { accountId: buyAssetAccountIds[0] ?? '' }
    const buyAccountMetadata = selectPortfolioAccountMetadataByAccountId(state, buyAccountFilter)
    const sellAssetAccountIds = selectPortfolioAccountIdsByAssetId(state, {
      assetId: sellAsset?.assetId ?? '',
    })
    const sellAccountFilter = { accountId: sellAssetAccountIds[0] ?? '' }
    const sellAccountMetadata = selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter)

    const receiveAddress = await getFirstReceiveAddress({
      accountSpecifiersList,
      buyAsset,
      chainAdapter,
      wallet,
      bip44Params: buyAccountMetadata.bip44Params,
      accountType: buyAccountMetadata.accountType,
    })

    const trade: Trade<KnownChainIds> = await (async () => {
      const { chainNamespace } = fromAssetId(sellAsset.assetId)
      if (isSupportedSwappingChain(sellAsset.chainId) && sellAccountBip44Params) {
        return swapper.buildTrade({
          chainId: sellAsset.chainId,
          sellAmount: amount,
          sellAsset,
          buyAsset,
          bip44Params: sellAccountMetadata.bip44Params,
          accountType: sellAccountMetadata.accountType,
          wallet,
          sendMax: false,
          receiveAddress,
        })
      } else if (chainNamespace === CHAIN_NAMESPACE.Utxo && sellAccountMetadata.accountType) {
        const sellAssetChainAdapter = getChainAdapterManager().get(
          sellAsset.chainId,
        ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
        const { xpub } = await sellAssetChainAdapter.getPublicKey(
          wallet,
          sellAccountMetadata.bip44Params,
          sellAccountMetadata.accountType,
        )
        return swapper.buildTrade({
          chainId: sellAsset.chainId as UtxoSupportedChainIds,
          sellAmount: amount,
          sellAsset,
          buyAsset,
          wallet,
          sendMax: false,
          receiveAddress,
          bip44Params: sellAccountMetadata.bip44Params,
          accountType: sellAccountMetadata.accountType,
          xpub,
        })
      }
      throw new Error(`unsupported chain id ${sellAsset.chainId}`)
    })()

    await setFormFees({ trade, sellAsset, tradeFeeSource: swapper.name })
    setValue('trade', trade)
  }

  const getTradeTxs = async (tradeResult: TradeResult): Promise<TradeTxs> => {
    const swapper = (await swapperManager.getBestSwapper({
      buyAssetId: trade.buyAsset.assetId,
      sellAssetId: trade.sellAsset.assetId,
    })) as Swapper<ChainId>
    if (!swapper) throw new Error('no swapper available')

    return swapper.getTradeTxs(tradeResult)
  }

  const executeQuote = async (): Promise<TradeResult> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: trade.buyAsset.assetId,
      sellAssetId: trade.sellAsset.assetId,
    })
    if (!swapper) throw new Error('no swapper available')
    if (!wallet) throw new Error('no wallet available')

    return swapper.executeTrade({ trade, wallet })
  }

  type GetFirstReceiveAddressArgs = {
    accountSpecifiersList: ReturnType<typeof selectAccountSpecifiers>
    buyAsset: Asset
    chainAdapter: ChainAdapter<ChainId>
    wallet: HDWallet
    bip44Params: BIP44Params
    accountType: UtxoAccountType | undefined
  }
  type GetFirstReceiveAddress = (args: GetFirstReceiveAddressArgs) => Promise<string>
  const getFirstReceiveAddress: GetFirstReceiveAddress = async ({
    accountSpecifiersList,
    buyAsset,
    chainAdapter,
    wallet,
    bip44Params,
    accountType,
  }) => {
    // Get first specifier for receive asset chain id
    // Eventually we may want to customize which account they want to receive trades into
    const receiveAddressAccountSpecifiers = accountSpecifiersList.find(
      specifiers => specifiers[buyAsset.chainId],
    )

    if (!receiveAddressAccountSpecifiers) throw new Error('no receiveAddressAccountSpecifiers')
    const account = receiveAddressAccountSpecifiers[buyAsset.chainId]
    if (!account) throw new Error(`no account for ${buyAsset.chainId}`)

    const receiveAddress = await chainAdapter.getAddress({ wallet, accountType, bip44Params })
    return receiveAddress
  }

  const getUtxoParams = (sellAssetAccountId: string) => {
    if (!sellAssetAccountId) throw new Error('No UTXO account specifier')
    return accountIdToUtxoParams(sellAssetAccountId, 0)
  }

  const updateQuoteDebounced = useRef(
    debounce(
      async ({
        amount,
        swapper,
        sellAsset,
        buyAsset,
        action,
        wallet,
        accountSpecifiersList,
        selectedCurrencyToUsdRate,
        sellAssetAccountId,
        sellAssetFiatRate,
        buyAssetFiatRate,
      }: DebouncedQuoteInput) => {
        try {
          const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount } = calculateAmounts({
            amount,
            buyAsset,
            sellAsset,
            buyAssetUsdRate: buyAssetFiatRate,
            sellAssetUsdRate: sellAssetFiatRate,
            action,
            selectedCurrencyToUsdRate,
            tradeFee: bn(0), // A temporary shim so we don't propagate new tradeFee logic to V1 Swapper
          })

          const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
          const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

          if (!chainAdapter)
            throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

          const state = store.getState()
          const buyAssetAccountIds = selectPortfolioAccountIdsByAssetId(state, {
            assetId: buyAsset?.assetId ?? '',
          })
          const sellAssetAccountIds = selectPortfolioAccountIdsByAssetId(state, {
            assetId: sellAsset?.assetId ?? '',
          })
          const sellAccountFilter = { accountId: sellAssetAccountIds[0] ?? '' }
          const buyAccountFilter = { accountId: buyAssetAccountIds[0] ?? '' }

          const buyAccountMetadata = selectPortfolioAccountMetadataByAccountId(
            state,
            buyAccountFilter,
          )
          const sellAccountMetadata = selectPortfolioAccountMetadataByAccountId(
            state,
            sellAccountFilter,
          )

          const receiveAddress = await getFirstReceiveAddress({
            accountSpecifiersList,
            buyAsset,
            chainAdapter,
            wallet,
            bip44Params: buyAccountMetadata.bip44Params,
            accountType: buyAccountMetadata.accountType,
          })

          const tradeQuote: TradeQuote<KnownChainIds> = await (async () => {
            const { chainNamespace } = fromAssetId(sellAsset.assetId)
            if (isSupportedSwappingChain(sellAsset.chainId)) {
              return swapper.getTradeQuote({
                chainId: sellAsset.chainId,
                sellAsset,
                buyAsset,
                sellAmount: cryptoSellAmount,
                sendMax: false,
                bip44Params: sellAccountMetadata.bip44Params,
                receiveAddress,
              })
            } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
              if (!sellAccountMetadata.accountType) throw new Error('no accountType')
              const sellAssetChainAdapter = getChainAdapterManager().get(
                sellAsset.chainId,
              ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
              const { xpub } = await sellAssetChainAdapter.getPublicKey(
                wallet,
                sellAccountMetadata.bip44Params,
                sellAccountMetadata.accountType,
              )
              return swapper.getTradeQuote({
                chainId: sellAsset.chainId as UtxoSupportedChainIds,
                sellAsset,
                buyAsset,
                sellAmount: cryptoSellAmount,
                sendMax: false,
                bip44Params: sellAccountMetadata.bip44Params,
                accountType: sellAccountMetadata.accountType,
                receiveAddress,
                xpub,
              })
            }
            throw new Error(`unsupported chain id ${sellAsset.chainId}`)
          })()

          await setFormFees({ trade: tradeQuote, sellAsset, tradeFeeSource: swapper.name })

          const minSellAmount = toBaseUnit(tradeQuote.minimum, tradeQuote.sellAsset.precision)
          const isBelowMinSellAmount = bnOrZero(tradeQuote.sellAmount).lt(minSellAmount)

          if (isBelowMinSellAmount) {
            setValue('quoteError', SwapErrorTypes.TRADE_QUOTE_AMOUNT_TOO_SMALL)
          }
          setValue('quote', tradeQuote)

          // Update trade input form fields to new calculated amount
          setValue('fiatSellAmount', fiatSellAmount) // Fiat input field amount
          setValue('buyTradeAsset.amount', fromBaseUnit(cryptoBuyAmount, buyAsset.precision)) // Buy asset input field amount
          setValue('sellTradeAsset.amount', fromBaseUnit(cryptoSellAmount, sellAsset.precision)) // Sell asset input field amount
        } catch (e) {
          if (
            e instanceof SwapError &&
            e.code &&
            [
              SwapErrorTypes.TRADE_QUOTE_AMOUNT_TOO_SMALL,
              SwapErrorTypes.TRADE_QUOTE_INPUT_LOWER_THAN_FEES,
            ].includes(e.code as SwapErrorTypes)
          ) {
            // TODO: Abstract me away, current error handling is a mess
            // We will need a full swapper error refactoring, to have a single source of truth for errors handling, and to be able to either:
            //   - set a form error field to be consumed as form button states
            //   - pop an error toast
            // depending on the error type
            return setValue('quoteError', SwapErrorTypes[e.code as SwapErrorTypes])
          }
          showErrorToast(e)
        }
      },
      debounceTime,
    ),
  )

  const updateQuote = useCallback(
    async ({
      amount,
      sellAsset,
      buyAsset,
      action,
      forceQuote,
      selectedCurrencyToUsdRate,
    }: GetQuoteInput) => {
      setValue('quoteError', null)
      if (!wallet || !accountSpecifiersList.length) return
      if (!sellAssetAccountId) return
      if (!sellAssetFiatRate || !buyAssetFiatRate || !feeAssetFiatRate) return
      if (!forceQuote && bnOrZero(amount).isZero()) return
      if (!Array.from(swapperManager.swappers.keys()).length) return
      setValue('quote', undefined)
      clearErrors('quote')

      const swapper = await swapperManager.getBestSwapper({
        buyAssetId: buyAsset.assetId,
        sellAssetId: sellAsset.assetId,
      })

      // we assume that if we do not have a swapper returned, it is not a valid trade pair
      if (!swapper) {
        setError('quote', { message: 'trade.errors.invalidTradePairBtnText' })
        return toast({
          title: translate('trade.errors.title'),
          description: translate('trade.errors.invalidTradePair', {
            sellAssetName: sellAsset.name,
            buyAssetName: buyAsset.name,
          }),
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top-right',
        })
      } else {
        await updateQuoteDebounced.current({
          swapper,
          amount,
          sellAsset,
          action,
          buyAsset,
          wallet,
          accountSpecifiersList,
          selectedCurrencyToUsdRate,
          sellAssetAccountId,
          sellAssetFiatRate,
          buyAssetFiatRate,
          feeAssetFiatRate,
        })
      }
    },
    [
      setValue,
      wallet,
      accountSpecifiersList,
      sellAssetAccountId,
      sellAssetFiatRate,
      buyAssetFiatRate,
      feeAssetFiatRate,
      swapperManager,
      clearErrors,
      setError,
      toast,
      translate,
    ],
  )

  const setFormFees = async ({
    trade,
    sellAsset,
    tradeFeeSource,
  }: {
    trade: Trade<KnownChainIds> | TradeQuote<KnownChainIds>
    sellAsset: Asset
    tradeFeeSource: string
  }) => {
    const feeBN = bnOrZero(trade?.feeData?.fee).dividedBy(
      bn(10).exponentiatedBy(feeAsset.precision),
    )
    const fee = feeBN.toString()

    const getEvmFees = <T extends EvmChainId>(): DisplayFeeData<T> => {
      const evmTrade = trade as Trade<T>
      const approvalFee = bnOrZero(evmTrade.feeData.chainSpecific.approvalFee)
        .dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
        .toString()
      const totalFee = feeBN.plus(approvalFee).toString()
      const gasPrice = bnOrZero(evmTrade.feeData.chainSpecific.gasPrice).toString()
      const estimatedGas = bnOrZero(evmTrade.feeData.chainSpecific.estimatedGas).toString()

      return {
        fee,
        chainSpecific: {
          approvalFee,
          gasPrice,
          estimatedGas,
          totalFee,
        },
        tradeFee: evmTrade.feeData.tradeFee,
        tradeFeeSource,
      } as unknown as DisplayFeeData<T>
    }

    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        const fees = getEvmFees()
        setValue('fees', fees)
        break
      case CHAIN_NAMESPACE.CosmosSdk: {
        const fees: DisplayFeeData<KnownChainIds.OsmosisMainnet | KnownChainIds.CosmosMainnet> = {
          fee,
          tradeFee: trade.feeData.tradeFee,
          tradeFeeSource: trade.sources[0].name,
        }
        setValue('fees', fees)
        break
      }
      case CHAIN_NAMESPACE.Utxo:
        {
          const utxoTrade = trade as Trade<UtxoSupportedChainIds>

          const fees: DisplayFeeData<UtxoSupportedChainIds> = {
            fee,
            chainSpecific: utxoTrade.feeData.chainSpecific,
            tradeFee: utxoTrade.feeData.tradeFee,
            tradeFeeSource,
          }
          setValue('fees', fees)
        }
        break
      default:
        throw new Error('Unsupported chain ' + sellAsset.chainId)
    }
  }

  const checkApprovalNeeded = async (): Promise<boolean> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })
    if (!swapper) throw new Error('no swapper available')
    if (!wallet) throw new Error('no wallet available')
    const { approvalNeeded } = await swapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }

  const approve = async (): Promise<string> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })

    if (!swapper) throw new Error('no swapper available')
    if (!wallet) throw new Error('no wallet available')
    const txid = isExactAllowance
      ? await swapper.approveAmount({ amount: quote.sellAmount, quote, wallet })
      : await swapper.approveInfinite({ quote, wallet })
    return txid
  }

  const reset = () => {
    setValue('buyTradeAsset.amount', '')
    setValue('sellTradeAsset.amount', '')
    setValue('fiatSellAmount', '')
  }

  return {
    swapperManager,
    updateQuote,
    updateTrade,
    executeQuote,
    getSupportedBuyAssetsFromSellAsset,
    getSupportedSellableAssets,
    checkApprovalNeeded,
    approve,
    getSendMaxAmount,
    reset,
    feeAsset,
    getTradeTxs,
  }
}
