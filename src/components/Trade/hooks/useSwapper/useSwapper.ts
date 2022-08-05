import { useToast } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import {
  avalancheAssetId,
  avalancheChainId,
  CHAIN_NAMESPACE,
  ChainId,
  ethChainId,
  fromAssetId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { avalanche, ChainAdapter, ethereum, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  CowSwapper,
  OsmosisSwapper,
  Swapper,
  SwapperManager,
  SwapSupportedUtxoChainIds,
  ThorchainSwapper,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
  ZrxSwapper,
} from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { DisplayFeeData, TradeAmountInputField, TradeAsset } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'
import { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { calculateAmounts } from './calculateAmounts'

const debounceTime = 1000

type GetQuoteInput = {
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  feeAsset: Asset
  action: TradeAmountInputField
  forceQuote?: boolean
  selectedCurrencyToUsdRate: BigNumber
}

type DebouncedQuoteInput = {
  swapper: Swapper<ChainId>
  amount: string
  sellAsset: Asset
  buyAsset: Asset
  feeAsset: Asset
  action: TradeAmountInputField
  wallet: HDWallet
  accountSpecifiersList: AccountSpecifierMap[]
  selectedCurrencyToUsdRate: BigNumber
}

// singleton - do not export me, use getSwapperManager
let _swapperManager: SwapperManager | null = null
// singleton - do not export me
// Used to short circuit calls to getSwapperManager if flags have not changed
let previousFlags: string = ''

const getSwapperManager = async (): Promise<SwapperManager> => {
  const flags = store.getState().preferences.featureFlags
  const flagsChanged = previousFlags !== JSON.stringify(flags)
  if (_swapperManager && !flagsChanged) return _swapperManager
  previousFlags = JSON.stringify(flags)

  // instantiate if it doesn't already exist
  _swapperManager = new SwapperManager()

  const adapterManager = getChainAdapterManager()
  const ethWeb3 = getWeb3InstanceByChainId(ethChainId)
  const avaxWeb3 = getWeb3InstanceByChainId(avalancheChainId)

  /** NOTE - ordering here defines the priority - until logic is implemented in getBestSwapper */

  if (flags.Thor) {
    await (async () => {
      const midgardUrl = getConfig().REACT_APP_MIDGARD_URL
      const thorSwapper = new ThorchainSwapper({
        midgardUrl,
        adapterManager,
        web3: ethWeb3,
      })
      await thorSwapper.initialize()
      _swapperManager.addSwapper(thorSwapper)
    })()
  }

  const ethereumChainAdapter = adapterManager.get(
    KnownChainIds.EthereumMainnet,
  ) as unknown as ethereum.ChainAdapter

  if (flags.CowSwap) {
    const cowSwapper = new CowSwapper({
      adapter: ethereumChainAdapter,
      apiUrl: getConfig().REACT_APP_COWSWAP_HTTP_URL,
      web3: ethWeb3,
    })

    _swapperManager.addSwapper(cowSwapper)
  }

  const zrxEthereumSwapper = new ZrxSwapper({
    web3: ethWeb3,
    adapter: ethereumChainAdapter,
  })
  _swapperManager.addSwapper(zrxEthereumSwapper)

  if (flags.Avalanche) {
    const avalancheChainAdapter = adapterManager.get(
      KnownChainIds.AvalancheMainnet,
    ) as unknown as avalanche.ChainAdapter

    const zrxAvalancheSwapper = new ZrxSwapper({
      web3: avaxWeb3,
      adapter: avalancheChainAdapter,
    })
    _swapperManager.addSwapper(zrxAvalancheSwapper)
  }

  if (flags.Osmosis) {
    const osmoUrl = getConfig().REACT_APP_OSMOSIS_NODE_URL
    const cosmosUrl = getConfig().REACT_APP_COSMOS_NODE_URL
    const osmoSwapper = new OsmosisSwapper({ adapterManager, osmoUrl, cosmosUrl })
    _swapperManager.addSwapper(osmoSwapper)
  }

  return _swapperManager
}

export const useSwapper = () => {
  const toast = useToast()
  const translate = useTranslate()
  const { setValue, setError, clearErrors } = useFormContext()
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

  const getDefaultPair = useCallback((connectedChainId: ChainId | undefined) => {
    switch (connectedChainId) {
      case KnownChainIds.AvalancheMainnet:
        return [avalancheAssetId, 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab']
      case KnownChainIds.EthereumMainnet:
      default:
        // eth & fox
        return ['eip155:1/slip44:60', 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d']
    }
  }, [])

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, {
      assetId: sellTradeAsset?.asset?.assetId ?? '',
    }),
  )

  // TODO: rename to sellFeeAsset
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

    const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
    const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

    if (!chainAdapter) throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

    const receiveAddress = await getFirstReceiveAddress({
      accountSpecifiersList,
      buyAsset,
      chainAdapter,
      wallet,
    })

    const tradeQuote = await (async () => {
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
        const { accountType, utxoParams } = getUtxoParams(accountSpecifiersList, sellAsset)
        if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
        return swapper.buildTrade({
          chainId: sellAsset.chainId as SwapSupportedUtxoChainIds,
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

  // TODO accountSpecifier must come from dropdown furing asset selection
  // We are defaulting temporarily for development
  const getUtxoParams = (accountSpecifiersList: AccountSpecifierMap[], sellAsset: Asset) => {
    const accountSpecifiers = accountSpecifiersList.find(
      specifiers => specifiers[sellAsset.chainId],
    )

    if (!accountSpecifiers) throw new Error('no btc account specifiers')
    const accountSpecifier = accountSpecifiers[sellAsset.chainId]
    if (!accountSpecifier) throw new Error('no btc account specifier')

    const accountId = toAccountId({
      chainId: sellAsset.chainId,
      account: accountSpecifier,
    })
    return accountIdToUtxoParams(accountId, 0)
  }

  const updateQuoteDebounced = useRef(
    debounce(
      async ({
        amount,
        swapper,
        sellAsset,
        feeAsset,
        buyAsset,
        action,
        wallet,
        accountSpecifiersList,
        selectedCurrencyToUsdRate,
      }: DebouncedQuoteInput) => {
        try {
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

          const { chainNamespace } = fromAssetId(sellAsset.assetId)

          const tradeQuote: TradeQuote<KnownChainIds> = await (async () => {
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
              const { accountType, utxoParams } = getBtcUtxoParams(accountSpecifiersList, sellAsset)

              if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
              return swapper.getTradeQuote({
                chainId: sellAsset.chainId as SwapSupportedUtxoChainIds,
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
          setValue('buyAssetFiatRate', buyAssetUsdRate)
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
    async ({
      amount,
      sellAsset,
      buyAsset,
      feeAsset,
      action,
      forceQuote,
      selectedCurrencyToUsdRate,
    }: GetQuoteInput) => {
      if (!wallet || !accountSpecifiersList.length) return
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
          feeAsset,
          sellAsset,
          action,
          buyAsset,
          wallet,
          accountSpecifiersList,
          selectedCurrencyToUsdRate,
        })
      }
    },
    [
      wallet,
      accountSpecifiersList,
      setValue,
      clearErrors,
      swapperManager,
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
          const utxoTrade = trade as Trade<SwapSupportedUtxoChainIds>

          const fees: DisplayFeeData<SwapSupportedUtxoChainIds> = {
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
