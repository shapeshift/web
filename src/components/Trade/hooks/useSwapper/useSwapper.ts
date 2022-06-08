import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import {
  QuoteFeeData,
  SwapperManager,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
  ZrxSwapper,
} from '@shapeshiftoss/swapper'
import { Asset, SupportedChainIds, SwapperType } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { TradeAmountInputField, TradeAsset } from 'components/Trade/types'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { getWeb3Instance } from 'lib/web3-instance'
import {
  selectAssetIds,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { calculateAmounts } from './calculateAmounts'

const debounceTime = 1000

type GetQuoteInput = {
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  feeAsset: Asset
  action: TradeAmountInputField
  forceQuote?: boolean
}

export const useSwapper = () => {
  const { setValue } = useFormContext()
  const [quote, sellTradeAsset, trade] = useWatch({
    name: ['quote', 'sellAsset', 'trade'],
  }) as [
    TradeQuote<SupportedChainIds> & Trade<SupportedChainIds>,
    TradeAsset | undefined,
    Trade<SupportedChainIds>,
  ]
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    const web3 = getWeb3Instance()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3, adapterManager }))
    return manager
  })

  const filterAssetsByIds = (assets: Asset[], assetIds: string[]) => {
    const assetIdMap = Object.fromEntries(assetIds.map(assetId => [assetId, true]))
    return assets.filter(asset => assetIdMap[asset.assetId])
  }

  const assetIds = useSelector(selectAssetIds)
  const getSupportedSellableAssets = useCallback(
    (assets: Asset[]) => {
      const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({ assetIds })
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

  const getDefaultPair = useCallback(() => {
    // eth & fox
    return ['eip155:1/slip44:60', 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d']
  }, [])

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, { assetId: sellTradeAsset?.asset?.assetId ?? '' }),
  )

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? 'eip155:1/slip44:60'),
  )

  const { showErrorToast } = useErrorHandler()

  const getSendMaxAmount = async ({
    sellAsset,
    feeAsset,
  }: {
    wallet: HDWallet
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

  const updateTrade = async ({
    wallet,
    sellAsset,
    buyAsset,
    amount,
  }: {
    wallet: HDWallet
    sellAsset: Asset
    buyAsset: Asset
    amount: string
  }): Promise<void> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: buyAsset.assetId,
      sellAssetId: sellAsset.assetId,
    })

    if (!swapper) throw new Error('no swapper available')

    const result = await swapper.buildTrade({
      sellAmount: amount,
      sellAsset,
      buyAsset,
      sellAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
      buyAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
      wallet,
      sendMax: true,
    })
    setFees(result, sellAsset)
    setValue('trade', result)
  }

  const getTradeTxs = async (tradeResult: TradeResult): Promise<TradeTxs> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: trade.buyAsset.assetId,
      sellAssetId: trade.sellAsset.assetId,
    })
    if (!swapper) throw new Error('no swapper available')
    return swapper.getTradeTxs(tradeResult)
  }

  const executeQuote = async ({ wallet }: { wallet: HDWallet }): Promise<TradeResult> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: trade.buyAsset.assetId,
      sellAssetId: trade.sellAsset.assetId,
    })
    if (!swapper) throw new Error('no swapper available')
    return swapper.executeTrade({ trade, wallet })
  }

  const updateQuoteDebounced = useRef(
    debounce(async ({ amount, sellAsset, buyAsset, action }) => {
      try {
        const swapper = await swapperManager.getBestSwapper({
          buyAssetId: buyAsset.assetId,
          sellAssetId: sellAsset.assetId,
        })

        if (!swapper) throw new Error('no swapper available')

        const [sellAssetUsdRate, buyAssetUsdRate, feeAssetUsdRate] = await Promise.all([
          swapper.getUsdRate({ ...sellAsset }),
          swapper.getUsdRate({ ...buyAsset }),
          swapper.getUsdRate({ ...feeAsset }),
        ])

        const { sellAmount, buyAmount, fiatSellAmount } = await calculateAmounts({
          amount,
          buyAsset,
          sellAsset,
          buyAssetUsdRate,
          sellAssetUsdRate,
          action,
        })

        const tradeQuote = await swapper.getTradeQuote({
          sellAsset,
          buyAsset,
          sellAmount,
          sendMax: false,
          sellAssetAccountId: '0',
        })

        setFees(tradeQuote, sellAsset)

        setValue('quote', tradeQuote)
        setValue('sellAssetFiatRate', sellAssetUsdRate)
        setValue('feeAssetFiatRate', feeAssetUsdRate)

        // Update trade input form fields to new calculated amount
        setValue('fiatSellAmount', fiatSellAmount) // Fiat input field amount
        setValue('buyAsset.amount', fromBaseUnit(buyAmount, buyAsset.precision)) // Buy asset input field amount
        setValue('sellAsset.amount', fromBaseUnit(sellAmount, sellAsset.precision)) // Sell asset input field amount
      } catch (e) {
        showErrorToast(e)
      }
    }, debounceTime),
  )

  const updateQuote = async ({
    amount,
    sellAsset,
    buyAsset,
    feeAsset,
    action,
    forceQuote,
  }: GetQuoteInput) => {
    if (!forceQuote && bnOrZero(amount).isZero()) return
    setValue('quote', undefined)
    await updateQuoteDebounced.current({
      amount,
      feeAsset,
      sellAsset,
      action,
      buyAsset,
    })
  }

  const setFees = async (
    trade: Trade<SupportedChainIds> | TradeQuote<SupportedChainIds>,
    sellAsset: Asset,
  ) => {
    const feeBN = bnOrZero(trade?.feeData?.fee).dividedBy(
      bn(10).exponentiatedBy(feeAsset.precision),
    )
    const fee = feeBN.toString()

    switch (sellAsset.chainId) {
      case 'eip155:1':
        {
          const zrxTrade = trade as Trade<'eip155:1'>
          const approvalFee = bnOrZero(zrxTrade?.feeData?.chainSpecific?.approvalFee)
            .dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
            .toString()
          const totalFee = feeBN.plus(approvalFee).toString()
          const gasPrice = bnOrZero(zrxTrade?.feeData?.chainSpecific?.gasPrice).toString()
          const estimatedGas = bnOrZero(zrxTrade?.feeData?.chainSpecific?.estimatedGas).toString()

          // get rid of this type hack in followup PR once corresponding lib pr is merged
          const fees: QuoteFeeData<'eip155:1'> & { tradeFee?: string } = {
            fee,
            chainSpecific: {
              approvalFee,
              gasPrice,
              estimatedGas,
              totalFee,
            },
            tradeFee: '0', // TODO populate this from trade once corresponding lib pr is merged
          }
          setValue('fees', fees)
        }
        break
      default:
        throw new Error('Unsupported chain ' + sellAsset.chain)
    }
  }

  const checkApprovalNeeded = async (wallet: HDWallet | NativeHDWallet): Promise<boolean> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })

    if (!swapper) throw new Error('no swapper available')
    const { approvalNeeded } = await swapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }

  const approveInfinite = async (wallet: HDWallet | NativeHDWallet): Promise<string> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })

    if (!swapper) throw new Error('no swapper available')
    const txid = await swapper.approveInfinite({ quote, wallet })
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
    approveInfinite,
    getSendMaxAmount,
    reset,
    feeAsset,
    getTradeTxs,
  }
}
