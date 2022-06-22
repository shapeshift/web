import { ChainId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import {
  QuoteFeeData,
  Swapper,
  SwapperManager,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
  ZrxSwapper,
} from '@shapeshiftoss/swapper'
import { Asset, KnownChainIds, SwapperType } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { TradeAmountInputField, TradeAsset } from 'components/Trade/types'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
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
    TradeQuote<KnownChainIds> & Trade<KnownChainIds>,
    TradeAsset | undefined,
    Trade<KnownChainIds>,
  ]
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    return manager
  })

  useEffect(() => {
    if (!adapterManager || !swapperManager) return

    const web3 = getWeb3Instance()

    ;(async () => {
      // const midgardUrl = getConfig().REACT_APP_MIDGARD_URL
      // const thorSwapper = new ThorchainSwapper({
      //   midgardUrl,
      //   adapterManager,
      //   web3,
      // })
      // await thorSwapper.initialize()
      // swapperManager.addSwapper(SwapperType.Thorchain, thorSwapper)

      const zrxSwapper = new ZrxSwapper({
        web3,
        adapter: adapterManager.get('eip155:1') as unknown as ethereum.ChainAdapter,
      })

      await zrxSwapper.initialize()
      swapperManager.addSwapper(SwapperType.Zrx, zrxSwapper)
    })()
  }, [adapterManager, swapperManager])

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

    const result = await (async () => {
      if (sellAsset.chainId === 'eip155:1') {
        return swapper.buildTrade({
          chainId: sellAsset.chainId,
          sellAmount: amount,
          sellAsset,
          buyAsset,
          sellAssetAccountNumber: 0, // TODO: remove hard coded accountId when multiple accounts are implemented
          buyAssetAccountNumber: 0, // TODO: remove hard coded accountId when multiple accounts are implemented
          wallet,
          sendMax: true,
        })
      } else if (sellAsset.chainId === 'bip122:000000000019d6689c085ae165831e93') {
        // TODO do bitcoin specific trade quote including `bip44Params`, `accountType` and `wallet`
        // They will need to have selected an accountType from a modal if bitcoin
        throw new Error('bitcoin unsupported')
      }
      throw new Error(`unsupported chain id ${sellAsset.chainId}`)
    })()

    setFees(result, sellAsset)
    setValue('trade', result)
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

  const updateQuoteDebounced = useRef(
    debounce(async ({ amount, sellAsset, buyAsset, action, wallet }) => {
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

        const tradeQuote: TradeQuote<KnownChainIds> = await (async () => {
          if (sellAsset.chainId === 'eip155:1') {
            return swapper.getTradeQuote({
              chainId: 'eip155:1',
              sellAsset,
              buyAsset,
              sellAmount,
              sendMax: false,
              sellAssetAccountNumber: 0,
              wallet,
            })
          } else if (sellAsset.chainId === 'bip122:000000000019d6689c085ae165831e93') {
            // TODO do bitcoin specific trade quote including `bip44Params`, `accountType` and `wallet`
            // They will need to have selected an accountType from a modal if bitcoin
            throw new Error('bitcoin unsupported')
          }
          throw new Error(`unsupported chain id ${sellAsset.chainId}`)
        })()

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
    if (!wallet) return
    if (!forceQuote && bnOrZero(amount).isZero()) return
    setValue('quote', undefined)
    await updateQuoteDebounced.current({
      amount,
      feeAsset,
      sellAsset,
      action,
      buyAsset,
      wallet,
    })
  }

  const setFees = async (
    trade: Trade<KnownChainIds> | TradeQuote<KnownChainIds>,
    sellAsset: Asset,
  ) => {
    const feeBN = bnOrZero(trade?.feeData?.fee).dividedBy(
      bn(10).exponentiatedBy(feeAsset.precision),
    )
    const fee = feeBN.toString()

    switch (sellAsset.chainId) {
      case 'eip155:1':
        {
          const ethTrade = trade as Trade<'eip155:1'>
          const approvalFee = bnOrZero(ethTrade.feeData.chainSpecific.approvalFee)
            .dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
            .toString()
          const totalFee = feeBN.plus(approvalFee).toString()
          const gasPrice = bnOrZero(ethTrade.feeData.chainSpecific.gasPrice).toString()
          const estimatedGas = bnOrZero(ethTrade.feeData.chainSpecific.estimatedGas).toString()

          const fees: QuoteFeeData<'eip155:1'> = {
            fee,
            chainSpecific: {
              approvalFee,
              gasPrice,
              estimatedGas,
              totalFee,
            },
            tradeFee: ethTrade.feeData.tradeFee,
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

  const approveInfinite = async (): Promise<string> => {
    const swapper = await swapperManager.getBestSwapper({
      buyAssetId: quote.buyAsset.assetId,
      sellAssetId: quote.sellAsset.assetId,
    })

    if (!swapper) throw new Error('no swapper available')
    if (!wallet) throw new Error('no wallet available')
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
