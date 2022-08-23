import { useToast } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import {
  avalancheAssetId,
  CHAIN_NAMESPACE,
  ChainId,
  cosmosAssetId,
  ethAssetId,
  fromAssetId,
  osmosisAssetId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  SwapError,
  SwapErrorTypes,
  Swapper,
  SwapperManager,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
  UtxoSupportedChainIds,
} from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import {
  DisplayFeeData,
  TradeAmountInputField,
  TradeAsset,
  TradeState,
} from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { useGetUsdRateQuery } from 'state/apis/swapper/swapperApi'
import { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectFeatureFlags,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  sellAssetAccount: string
  sellAssetUsdRate: string
  buyAssetUsdRate: string
  feeAssetUsdRate: string
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
    sellAssetAccount,
    isExactAllowance,
    sellAssetUsdRate,
    buyAssetUsdRate,
    feeAssetUsdRate,
  ] = useWatch({
    name: [
      'quote',
      'sellAsset',
      'buyAsset',
      'trade',
      'sellAssetAccount',
      'isExactAllowance',
      'sellAssetUsdRate',
      'buyAssetUsdRate',
      'feeAssetUsdRate',
    ],
  }) as [
    TradeQuote<KnownChainIds> & Trade<KnownChainIds>,
    TradeAsset | undefined,
    TradeAsset | undefined,
    Trade<KnownChainIds>,
    TradeState<KnownChainIds>['sellAssetAccount'],
    boolean,
    string,
    string,
    string,
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

  const sellAssetUsdRateResponse = useGetUsdRateQuery({
    rateAssetId: sellTradeAssetId,
    buyAssetId: buyTradeAssetId,
    sellAssetId: sellTradeAssetId,
  })

  const buyAssetUsdRateResponse = useGetUsdRateQuery({
    rateAssetId: buyTradeAssetId,
    buyAssetId: buyTradeAssetId,
    sellAssetId: sellTradeAssetId,
  })

  const feeAssetUsdRateResponse = useGetUsdRateQuery({
    rateAssetId: feeAsset?.assetId,
    buyAssetId: buyTradeAssetId,
    sellAssetId: sellTradeAssetId,
  })

  useEffect(() => {
    buyAssetUsdRateResponse?.data &&
      setValue('buyAssetUsdRate', buyAssetUsdRateResponse?.data?.usdRate)
    sellAssetUsdRateResponse?.data &&
      setValue('sellAssetUsdRate', sellAssetUsdRateResponse?.data?.usdRate)
    feeAssetUsdRateResponse?.data &&
      setValue('feeAssetUsdRate', feeAssetUsdRateResponse?.data?.usdRate)
  }, [
    setValue,
    buyAssetUsdRateResponse?.data,
    sellAssetUsdRateResponse?.data,
    feeAssetUsdRateResponse?.data,
  ])

  const {
    state: { wallet },
  } = useWallet()

  const osmosisEnabled = useFeatureFlag('Osmosis')

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

  const getDefaultPair = useCallback(
    (buyAssetChainId: ChainId | undefined) => {
      const ethFoxPair = [ethAssetId, 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d']
      switch (buyAssetChainId) {
        case KnownChainIds.AvalancheMainnet:
          return [avalancheAssetId, 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab']
        case KnownChainIds.CosmosMainnet:
          return osmosisEnabled ? [cosmosAssetId, osmosisAssetId] : ethFoxPair
        case KnownChainIds.OsmosisMainnet:
          return osmosisEnabled ? [osmosisAssetId, cosmosAssetId] : ethFoxPair
        case KnownChainIds.EthereumMainnet:
        default:
          return ethFoxPair
      }
    },
    [osmosisEnabled],
  )

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      accountId: sellAssetAccount,
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

    setValue('sellAsset.amount', maxAmount)
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
      chainId === KnownChainIds.CosmosMainnet
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
    if (!sellAssetAccount) throw new Error('no sellAssetAccount available')

    const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
    const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

    if (!chainAdapter) throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

    const receiveAddress = await getFirstReceiveAddress({
      accountSpecifiersList,
      buyAsset,
      chainAdapter,
      wallet,
    })

    const trade: Trade<KnownChainIds> = await (async () => {
      const { chainNamespace } = fromAssetId(sellAsset.assetId)
      if (isSupportedSwappingChain(sellAsset.chainId)) {
        return swapper.buildTrade({
          chainId: sellAsset.chainId,
          sellAmount: amount,
          sellAsset,
          buyAsset,
          sellAssetAccountNumber: 0, // TODO: remove hard coded accountId when multiple accounts are implemented
          wallet,
          sendMax: false,
          receiveAddress,
        })
      } else if (chainNamespace === CHAIN_NAMESPACE.Bitcoin) {
        const { accountType, utxoParams } = getUtxoParams(sellAssetAccount)
        if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
        return swapper.buildTrade({
          chainId: sellAsset.chainId as UtxoSupportedChainIds,
          sellAmount: amount,
          sellAsset,
          buyAsset,
          sellAssetAccountNumber: 0,
          wallet,
          sendMax: false,
          receiveAddress,
          bip44Params: utxoParams.bip44Params,
          accountType,
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
  }
  type GetFirstReceiveAddress = (args: GetFirstReceiveAddressArgs) => Promise<string>
  const getFirstReceiveAddress: GetFirstReceiveAddress = async ({
    accountSpecifiersList,
    buyAsset,
    chainAdapter,
    wallet,
  }) => {
    // Get first specifier for receive asset chain id
    // Eventually we may want to customize which account they want to receive trades into
    const receiveAddressAccountSpecifiers = accountSpecifiersList.find(
      specifiers => specifiers[buyAsset.chainId],
    )

    if (!receiveAddressAccountSpecifiers) throw new Error('no receiveAddressAccountSpecifiers')
    const account = receiveAddressAccountSpecifiers[buyAsset.chainId]
    if (!account) throw new Error(`no account for ${buyAsset.chainId}`)

    const { chainId } = buyAsset
    const accountId = toAccountId({ chainId, account })

    const { accountType, utxoParams } = accountIdToUtxoParams(accountId, 0)

    const receiveAddress = await chainAdapter.getAddress({ wallet, accountType, ...utxoParams })
    return receiveAddress
  }

  const getUtxoParams = (sellAssetAccount: string) => {
    if (!sellAssetAccount) throw new Error('No UTXO account specifier')
    return accountIdToUtxoParams(sellAssetAccount, 0)
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
        sellAssetAccount,
        sellAssetUsdRate,
        buyAssetUsdRate,
        feeAssetUsdRate,
      }: DebouncedQuoteInput) => {
        try {
          const { sellAmount, buyAmount, fiatSellAmount } = await calculateAmounts({
            amount,
            buyAsset,
            sellAsset,
            buyAssetUsdRate,
            sellAssetUsdRate,
            action,
            selectedCurrencyToUsdRate,
          })

          const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
          const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

          if (!chainAdapter)
            throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

          const receiveAddress = await getFirstReceiveAddress({
            accountSpecifiersList,
            buyAsset,
            chainAdapter,
            wallet,
          })

          const tradeQuote: TradeQuote<KnownChainIds> = await (async () => {
            const { chainNamespace } = fromAssetId(sellAsset.assetId)
            if (isSupportedSwappingChain(sellAsset.chainId)) {
              return swapper.getTradeQuote({
                chainId: sellAsset.chainId,
                sellAsset,
                buyAsset,
                sellAmount,
                sendMax: false,
                sellAssetAccountNumber: 0,
                wallet,
                receiveAddress,
              })
            } else if (chainNamespace === CHAIN_NAMESPACE.Bitcoin) {
              const { accountType, utxoParams } = getUtxoParams(sellAssetAccount)
              if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
              return swapper.getTradeQuote({
                chainId: sellAsset.chainId as UtxoSupportedChainIds,
                sellAsset,
                buyAsset,
                sellAmount,
                sendMax: false,
                sellAssetAccountNumber: 0,
                wallet,
                bip44Params: utxoParams.bip44Params,
                accountType,
                receiveAddress,
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
          setValue('sellAssetFiatRate', sellAssetUsdRate)
          setValue('buyAssetFiatRate', buyAssetUsdRate)
          setValue('feeAssetFiatRate', feeAssetUsdRate)

          // Update trade input form fields to new calculated amount
          setValue('fiatSellAmount', fiatSellAmount) // Fiat input field amount
          setValue('buyAsset.amount', fromBaseUnit(buyAmount, buyAsset.precision)) // Buy asset input field amount
          setValue('sellAsset.amount', fromBaseUnit(sellAmount, sellAsset.precision)) // Sell asset input field amount
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
      if (!sellAssetAccount) return
      if (!sellAssetUsdRate || !buyAssetUsdRate || !feeAssetUsdRate) return
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
          sellAssetAccount,
          sellAssetUsdRate,
          buyAssetUsdRate,
          feeAssetUsdRate,
        })
      }
    },
    [
      setValue,
      wallet,
      accountSpecifiersList,
      sellAssetAccount,
      sellAssetUsdRate,
      buyAssetUsdRate,
      feeAssetUsdRate,
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
      case CHAIN_NAMESPACE.Ethereum:
        const fees = getEvmFees()
        setValue('fees', fees)
        break
      case CHAIN_NAMESPACE.Cosmos: {
        const fees: DisplayFeeData<KnownChainIds.OsmosisMainnet | KnownChainIds.CosmosMainnet> = {
          fee,
          tradeFee: trade.feeData.tradeFee,
          tradeFeeSource: trade.sources[0].name,
        }
        setValue('fees', fees)
        break
      }
      case CHAIN_NAMESPACE.Bitcoin:
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
    setValue('buyAsset.amount', '')
    setValue('sellAsset.amount', '')
    setValue('fiatSellAmount', '')
  }

  return {
    swapperManager,
    updateQuote,
    updateTrade,
    executeQuote,
    getSupportedBuyAssetsFromSellAsset,
    getSupportedSellableAssets,
    getDefaultPair,
    checkApprovalNeeded,
    approve,
    getSendMaxAmount,
    reset,
    feeAsset,
    getTradeTxs,
  }
}
