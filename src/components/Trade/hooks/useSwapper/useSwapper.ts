import { ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { avalanche, ethereum } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  Swapper,
  SwapperManager,
  ThorchainSwapper,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
  ZrxSwapper,
} from '@shapeshiftoss/swapper'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { DisplayFeeData, TradeAmountInputField, TradeAsset } from 'components/Trade/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { getWeb3Instance } from 'lib/web3-instance'
import { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { calculateAmounts } from './calculateAmounts'

const moduleLogger = logger.child({
  namespace: ['useSwapper'],
})

const debounceTime = 1000

type GetQuoteInput = {
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  feeAsset: Asset
  action: TradeAmountInputField
  forceQuote?: boolean
}

type DebouncedQuoteInput = {
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  feeAsset: Asset
  action: TradeAmountInputField
  wallet: HDWallet
  swapperManager: SwapperManager
  accountSpecifiersList: AccountSpecifierMap[]
}

// singleton - do not export me, use getSwapperManager
let _swapperManager: SwapperManager | null = null

const getSwapperManager = async (): Promise<SwapperManager> => {
  if (_swapperManager) return _swapperManager

  // instantiate if it doesn't already exist
  _swapperManager = new SwapperManager()

  const adapterManager = getChainAdapters()
  const web3 = getWeb3Instance()

  if (getConfig().REACT_APP_FEATURE_THOR) {
    await (async () => {
      const midgardUrl = getConfig().REACT_APP_MIDGARD_URL
      const thorSwapper = new ThorchainSwapper({
        midgardUrl,
        adapterManager,
        web3,
      })
      await thorSwapper.initialize()
      _swapperManager.addSwapper(thorSwapper)
    })()
  }

  const ethereumChainAdapter = adapterManager.get(
    KnownChainIds.EthereumMainnet,
  ) as unknown as ethereum.ChainAdapter

  const zrxEthereumSwapper = new ZrxSwapper({
    web3,
    adapter: ethereumChainAdapter,
  })

  try {
    _swapperManager.addSwapper(zrxEthereumSwapper)

    if (getConfig().REACT_APP_FEATURE_AVALANCHE) {
      const avalancheChainAdapter = adapterManager.get(
        KnownChainIds.AvalancheMainnet,
      ) as unknown as avalanche.ChainAdapter

      const zrxAvalancheSwapper = new ZrxSwapper({
        web3,
        adapter: avalancheChainAdapter,
      })

      _swapperManager.addSwapper(zrxAvalancheSwapper)
    }
  } catch (e) {
    moduleLogger.error(e, { fn: 'addSwapper' }, 'error adding swapper')
  }

  return _swapperManager
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

  // This will instantiate a manager with no swappers
  // Swappers will be added in the useEffect below
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())

  useEffect(() => {
    ;(async () => {
      setSwapperManager(await getSwapperManager())
    })()
  }, [])

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

    const tradeQuote = await (async () => {
      if (sellAsset.chainId === KnownChainIds.EthereumMainnet) {
        return swapper.buildTrade({
          chainId: sellAsset.chainId,
          sellAmount: amount,
          sellAsset,
          buyAsset,
          sellAssetAccountNumber: 0, // TODO: remove hard coded accountId when multiple accounts are implemented
          buyAssetAccountNumber: 0, // TODO: remove hard coded accountId when multiple accounts are implemented
          wallet,
          sendMax: true,
          receiveAddress: '', // TODO add this later with the buildTrade PR
        })
      } else if (sellAsset.chainId === KnownChainIds.BitcoinMainnet) {
        // TODO do bitcoin specific trade quote including `bip44Params`, `accountType` and `wallet`
        // They will need to have selected an accountType from a modal if bitcoin
        throw new Error('bitcoin unsupported')
      }
      throw new Error(`unsupported chain id ${sellAsset.chainId}`)
    })()

    await setFormFees({ trade: tradeQuote, sellAsset, tradeFeeSource: swapper.name })
    setValue('trade', tradeQuote)
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
    debounce(
      async ({
        amount,
        sellAsset,
        buyAsset,
        action,
        wallet,
        swapperManager,
        accountSpecifiersList,
      }: DebouncedQuoteInput) => {
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

          const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)

          const chainAdapter = getChainAdapters().get(receiveAddressChainId)

          if (!chainAdapter)
            throw new Error(`couldnt get chain adapter for ${receiveAddressChainId}`)

          // Get first specifier for receive asset chain id
          // Eventually we may want to customize which account they want to receive trades into
          const receiveAddressAccountSpecifiers = accountSpecifiersList.find(
            specifiers => specifiers[buyAsset.chainId],
          )

          if (!receiveAddressAccountSpecifiers)
            throw new Error('no receiveAddressAccountSpecifiers')
          const receiveAddressAccountSpecifier = receiveAddressAccountSpecifiers[buyAsset.chainId]
          if (!receiveAddressAccountSpecifier) throw new Error('no receiveAddressAccountSpecifier')

          const { accountType: receiveAddressAccountType, utxoParams: receiveAddressUtxoParams } =
            accountIdToUtxoParams(receiveAddressAccountSpecifiers[buyAsset.chainId], 0)

          const receiveAddress = await chainAdapter.getAddress({
            wallet,
            accountType: receiveAddressAccountType,
            ...receiveAddressUtxoParams,
          })

          const tradeQuote: TradeQuote<KnownChainIds> = await (async () => {
            if (sellAsset.chainId === KnownChainIds.EthereumMainnet) {
              return swapper.getTradeQuote({
                chainId: KnownChainIds.EthereumMainnet,
                sellAsset,
                buyAsset,
                sellAmount,
                sendMax: false,
                sellAssetAccountNumber: 0,
                wallet,
                receiveAddress,
              })
            } else if (sellAsset.chainId === KnownChainIds.BitcoinMainnet) {
              // TODO btcAccountSpecifier must come from the btc account selection modal
              // We are defaulting temporarily for development
              const btcAccountSpecifiers = accountSpecifiersList.find(
                specifiers => specifiers[KnownChainIds.BitcoinMainnet],
              )
              if (!btcAccountSpecifiers) throw new Error('no btc account specifiers')
              const btcAccountSpecifier = btcAccountSpecifiers[KnownChainIds.BitcoinMainnet]
              if (!btcAccountSpecifier) throw new Error('no btc account specifier')

              const { accountType, utxoParams } = accountIdToUtxoParams(btcAccountSpecifier, 0)
              if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
              return swapper.getTradeQuote({
                chainId: KnownChainIds.BitcoinMainnet,
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
      },
      debounceTime,
    ),
  )

  const updateQuote = useCallback(
    async ({ amount, sellAsset, buyAsset, feeAsset, action, forceQuote }: GetQuoteInput) => {
      if (!wallet || !accountSpecifiersList) return
      if (!forceQuote && bnOrZero(amount).isZero()) return
      setValue('quote', undefined)
      await updateQuoteDebounced.current({
        amount,
        feeAsset,
        sellAsset,
        action,
        buyAsset,
        wallet,
        swapperManager,
        accountSpecifiersList,
      })
    },
    [accountSpecifiersList, setValue, swapperManager, wallet],
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

    switch (sellAsset.chainId) {
      case KnownChainIds.EthereumMainnet:
        {
          const ethTrade = trade as Trade<KnownChainIds.EthereumMainnet>
          const approvalFee = bnOrZero(ethTrade.feeData.chainSpecific.approvalFee)
            .dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
            .toString()
          const totalFee = feeBN.plus(approvalFee).toString()
          const gasPrice = bnOrZero(ethTrade.feeData.chainSpecific.gasPrice).toString()
          const estimatedGas = bnOrZero(ethTrade.feeData.chainSpecific.estimatedGas).toString()

          const fees: DisplayFeeData<KnownChainIds.EthereumMainnet> = {
            fee,
            chainSpecific: {
              approvalFee,
              gasPrice,
              estimatedGas,
              totalFee,
            },
            tradeFee: ethTrade.feeData.tradeFee,
            tradeFeeSource,
          }
          setValue('fees', fees)
        }
        break
      case KnownChainIds.BitcoinMainnet:
        {
          const btcTrade = trade as Trade<KnownChainIds.BitcoinMainnet>

          const fees: DisplayFeeData<KnownChainIds.BitcoinMainnet> = {
            fee,
            chainSpecific: btcTrade.feeData.chainSpecific,
            tradeFee: btcTrade.feeData.tradeFee,
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
