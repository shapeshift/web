import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Stack,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, osmosisAssetId } from '@shapeshiftoss/caip'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AddressInput } from 'components/Modals/Send/AddressInput/AddressInput'
import { SendFormFields } from 'components/Modals/Send/SendCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useIsTradingActive } from 'components/Trade/hooks/useIsTradingActive'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getSendMaxAmountCryptoPrecision } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperService } from 'components/Trade/hooks/useSwapperService'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { parseAddressInputWithChainId } from 'lib/address/address'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { ProtocolFee } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import {
  selectSwapperApiPending,
  selectSwapperApiTradeQuotePending,
  selectSwapperQueriesInitiated,
} from 'state/apis/swapper/selectors'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectFeeAssetById,
} from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountIdByNumberByChainId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import {
  selectFeeAssetFiatRate,
  selectQuoteBuyAmountCryptoPrecision,
} from 'state/zustand/swapperStore/amountSelectors'
import {
  selectAction,
  selectActiveSwapperWithMetadata,
  selectAmount,
  selectBuyAmountCryptoPrecision,
  selectBuyAmountFiat,
  selectBuyAsset,
  selectBuyAssetAccountId,
  selectFees,
  selectPreferredSwapper,
  selectProtocolFees,
  selectQuote,
  selectReceiveAddress,
  selectSellAmountCryptoPrecision,
  selectSellAmountFiat,
  selectSellAsset,
  selectSellAssetAccountId,
  selectSlippage,
  selectSwapperSupportsCrossAccountTrade,
} from 'state/zustand/swapperStore/selectors'
import { swapperStore, useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import { breakpoints } from 'theme/theme'

import { TradeAssetSelect } from './Components/AssetSelection'
import { RateGasRow } from './Components/RateGasRow'
import type { TradeAssetInputProps } from './Components/TradeAssetInput'
import { TradeAssetInput } from './Components/TradeAssetInput'
import { TradeQuotes } from './Components/TradeQuotes/TradeQuotes'
import { useTradeRoutes } from './hooks/useTradeRoutes/useTradeRoutes'
import { ReceiveSummary } from './TradeConfirm/ReceiveSummary'
import { TradeAmountInputField, TradeRoutePaths } from './types'

const moduleLogger = logger.child({ namespace: ['TradeInput'] })

export const TradeInput = () => {
  useSwapperService()
  const [isLoading, setIsLoading] = useState(false)
  const [isSendMax, setIsSendMax] = useState(false)
  const [showQuotes, toggleShowQuotes] = useToggle(false)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isTradeRatesEnabled = useFeatureFlag('TradeRates')
  const { tradeQuoteArgs } = useTradeQuoteService()
  const [isManualAddressEntryValidating, setIsManualAddressEntryValidating] = useState(false)
  const isYatFeatureEnabled = useFeatureFlag('Yat')

  const {
    formState: { errors: formErrors, isValid: isFormValid },
    trigger: formTrigger,
    setValue: setFormValue,
  } = useFormContext()

  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = useIsTradingActive()

  const sellAssetAccountId = useSwapperStore(selectSellAssetAccountId)
  const buyAssetAccountId = useSwapperStore(selectBuyAssetAccountId)
  const updateSelectedSellAssetAccountId = useSwapperStore(
    state => state.updateSelectedSellAssetAccountId,
  )
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const activeQuote = useSwapperStore(selectQuote)
  const fees = useSwapperStore(selectFees)
  const slippage = useSwapperStore(selectSlippage)
  const updateTrade = useSwapperStore(state => state.updateTrade)
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateAmount = useSwapperStore(state => state.updateAmount)
  const updateReceiveAddress = useSwapperStore(state => state.updateReceiveAddress)
  const updatePreferredSwapper = useSwapperStore(state => state.updatePreferredSwapper)
  const fiatBuyAmount = useSwapperStore(selectBuyAmountFiat)
  const fiatSellAmount = useSwapperStore(selectSellAmountFiat)
  const receiveAddress = useSwapperStore(selectReceiveAddress)
  const feeAssetFiatRate = useSwapperStore(selectFeeAssetFiatRate)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellAssetChainId = sellAsset?.chainId
  const buyAssetChainId = buyAsset?.chainId
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))
  const buyAmountCryptoPrecision = useSwapperStore(selectBuyAmountCryptoPrecision)
  const sellAmountCryptoPrecision = useSwapperStore(selectSellAmountCryptoPrecision)
  const updateTradeAmountsFromQuote = useSwapperStore(state => state.updateTradeAmountsFromQuote)
  const updateFees = useSwapperStore(state => state.updateFees)
  const swapperSupportsCrossAccountTrade = useSwapperStore(selectSwapperSupportsCrossAccountTrade)
  const handleSwitchAssets = useSwapperStore(state => state.handleSwitchAssets)
  const handleInputAmountChange = useSwapperStore(state => state.handleInputAmountChange)
  const quoteBuyAmountCryptoPrecision = useSwapperStore(selectQuoteBuyAmountCryptoPrecision)
  const protocolFees = useSwapperStore(selectProtocolFees)
  const action = useSwapperStore(selectAction)
  const amount = useSwapperStore(selectAmount)
  const preferredSwapper = useSwapperStore(selectPreferredSwapper)
  const {
    getTrade,
    checkApprovalNeeded,
    supportedSellAssetsByMarketCap,
    supportedBuyAssetsByMarketCap,
    isSwapperInitialized,
  } = useSwapper()
  const translate = useTranslate()
  const history = useHistory()
  const mixpanel = getMixPanel()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const { handleSubmit } = useFormContext()
  const wallet = useWallet().state.wallet
  const { assetSearch } = useModal()
  const { handleAssetClick } = useTradeRoutes()

  const walletSupportsSellAssetChain = walletSupportsChain({ chainId: sellAssetChainId, wallet })
  const walletSupportsBuyAssetChain = walletSupportsChain({ chainId: buyAssetChainId, wallet })
  const shouldShowManualReceiveAddressInput = !walletSupportsBuyAssetChain

  // Trigger re-validation of the manually entered receive address
  useEffect(() => {
    formTrigger(SendFormFields.Input)
  }, [formTrigger, shouldShowManualReceiveAddressInput])

  // Reset the manual address input state when the user changes the buy asset
  useEffect(() => {
    setFormValue(SendFormFields.Input, '')
  }, [buyAsset.assetId, setFormValue])

  // For safety, ensure we never have a receive address in the store if the form is invalid
  useEffect(() => {
    !isFormValid && updateReceiveAddress(undefined)
  }, [isFormValid, updateReceiveAddress])

  // Selectors
  const assets = useAppSelector(selectAssets)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const activeSwapper = useSwapperStore(state => selectActiveSwapperWithMetadata(state)?.swapper)
  const activeSwapperName = useMemo(() => activeSwapper?.name, [activeSwapper])

  if (!sellFeeAsset) throw new Error(`Asset not found for AssetId ${sellAsset?.assetId}`)

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: sellFeeAsset?.assetId, accountId: sellAssetAccountId ?? '' }),
    [sellAssetAccountId, sellFeeAsset?.assetId],
  )
  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: sellAssetAccountId, assetId: sellAsset?.assetId ?? '' }),
    [sellAssetAccountId, sellAsset?.assetId],
  )

  const portfolioAccountBalancesBaseUnit = useAppSelector(selectPortfolioAccountBalancesBaseUnit)
  const sellAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )
  const sellAssetBalancePrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, sellAssetBalanceFilter),
  )
  const feeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const portfolioAccountIdByNumberByChainId = useAppSelector(
    selectPortfolioAccountIdByNumberByChainId,
  )

  const isYatSupportedByReceiveChain = buyAsset.chainId === ethChainId // yat only supports eth mainnet
  const isYatSupported = isYatFeatureEnabled && isYatSupportedByReceiveChain

  const isSwapperApiPending = useSelector(selectSwapperApiPending)
  const isTradeQuotePending = useSelector(selectSwapperApiTradeQuotePending)
  const isSwapperApiInitiated = useSelector(selectSwapperQueriesInitiated)

  const quoteAvailableForCurrentAssetPair = useMemo(() => {
    if (!activeQuote) return false
    return (
      activeQuote.steps[0].buyAsset.assetId === buyAsset?.assetId &&
      activeQuote.steps[0].sellAsset.assetId === sellAsset?.assetId
    )
  }, [buyAsset?.assetId, activeQuote, sellAsset?.assetId])

  const chainAdapterManager = getChainAdapterManager()
  const buyAssetChainName = chainAdapterManager.get(buyAsset.chainId)?.getDisplayName()

  const gasFeeFiat = bnOrZero(fees?.networkFeeCryptoHuman)
    .times(bnOrZero(feeAssetFiatRate))
    .toString()

  const hasValidSellAmount = bnOrZero(sellAmountCryptoPrecision).gt(0)

  const isBuyingOsmoWithOmosisSwapper =
    activeSwapperName === SwapperName.Osmosis && buyAsset.assetId === osmosisAssetId

  // TODO(woodenfurniture): update swappers to specify this as with protocol fees
  const networkFeeRequiresBalance = activeSwapperName !== SwapperName.CowSwap

  const handleInputChange = useCallback(
    (inputAction: TradeAmountInputField, inputAmount: string) => {
      // No-op if nothing material has changed
      if (inputAction === action && inputAmount === amount) return
      updateAction(inputAction)
      setIsSendMax(false)
      updatePreferredSwapper(undefined)
      updateAmount(inputAmount)

      handleInputAmountChange()
    },
    [
      action,
      amount,
      updateAction,
      setIsSendMax,
      updatePreferredSwapper,
      updateAmount,
      handleInputAmountChange,
    ],
  )

  useEffect(() => {
    if (!isSendMax) return

    // Active swapper is selected inside here to prevent infinite loop where we're updating the
    // value we're reacting to. Instead we react to the preferred swapper.
    const activeSwapperWithMetadata = selectActiveSwapperWithMetadata(swapperStore.getState())

    if (!activeSwapperWithMetadata) return

    const maxSendAmountCryptoPrecision = getSendMaxAmountCryptoPrecision(
      sellAsset,
      sellFeeAsset,
      activeSwapperWithMetadata.quote,
      sellAssetBalanceCryptoBaseUnit,
      networkFeeRequiresBalance,
      isBuyingOsmoWithOmosisSwapper,
    )

    updateAmount(maxSendAmountCryptoPrecision)
    handleInputAmountChange()
  }, [
    preferredSwapper,
    isBuyingOsmoWithOmosisSwapper,
    isSendMax,
    networkFeeRequiresBalance,
    sellAsset,
    sellAssetBalanceCryptoBaseUnit,
    sellFeeAsset,
    handleInputAmountChange,
    updateAmount,
  ])

  const handleSendMax = useCallback(() => {
    if (isSendMax) return
    setIsSendMax(true)
    updateAction(TradeAmountInputField.SELL_CRYPTO)
    updateAmount(fromBaseUnit(sellAssetBalanceCryptoBaseUnit, sellAsset.precision))
    handleInputAmountChange()
  }, [
    isSendMax,
    setIsSendMax,
    updateAction,
    updateAmount,
    sellAssetBalanceCryptoBaseUnit,
    sellAsset.precision,
    handleInputAmountChange,
  ])

  const onSubmit = useCallback(async () => {
    setIsLoading(true)
    try {
      if (sellAsset && buyAsset && mixpanel) {
        const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
        const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)
        mixpanel.track(MixPanelEvents.TradePreview, {
          buyAsset: compositeBuyAsset,
          sellAsset: compositeSellAsset,
          fiatAmount: fiatSellAmount,
          swapperName: activeSwapperName,
          [compositeBuyAsset]: buyAmountCryptoPrecision,
          [compositeSellAsset]: sellAmountCryptoPrecision,
        })
      }
      if (!wallet) throw new Error('No wallet available')
      const isApprovalNeeded = await checkApprovalNeeded()
      if (isApprovalNeeded) {
        history.push({ pathname: TradeRoutePaths.Approval })
        return
      }
      const trade = await getTrade()
      if (trade.isErr()) throw trade.unwrapErr()
      updateTrade(trade.unwrap())
      feeAsset && updateFees(feeAsset)
      updateTradeAmountsFromQuote()
      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      moduleLogger.error(e, 'onSubmit error')
    } finally {
      setIsLoading(false)
    }
  }, [
    assets,
    buyAmountCryptoPrecision,
    buyAsset,
    checkApprovalNeeded,
    feeAsset,
    fiatSellAmount,
    getTrade,
    history,
    mixpanel,
    sellAmountCryptoPrecision,
    sellAsset,
    activeSwapperName,
    updateFees,
    updateTrade,
    updateTradeAmountsFromQuote,
    wallet,
  ])

  const onSellAssetInputChange: TradeAssetInputProps['onChange'] = useCallback(
    async (value: string, isFiat: boolean | undefined) => {
      const action = isFiat ? TradeAmountInputField.SELL_FIAT : TradeAmountInputField.SELL_CRYPTO
      await handleInputChange(action, value)
    },
    [handleInputChange],
  )

  const onBuyAssetInputChange: TradeAssetInputProps['onChange'] = useCallback(
    async (value: string, isFiat: boolean | undefined) => {
      const action = isFiat ? TradeAmountInputField.BUY_FIAT : TradeAmountInputField.BUY_CRYPTO
      await handleInputChange(action, value)
    },
    [handleInputChange],
  )

  const handleSellAccountIdChange: AccountDropdownProps['onChange'] = useCallback(
    accountId => {
      setIsSendMax(false)
      updatePreferredSwapper(undefined)
      updateSelectedSellAssetAccountId(accountId)
    },
    [setIsSendMax, updatePreferredSwapper, updateSelectedSellAssetAccountId],
  )

  const handleBuyAccountIdChange: AccountDropdownProps['onChange'] = useCallback(
    accountId => {
      setIsSendMax(false)
      updatePreferredSwapper(undefined)
      updateSelectedBuyAssetAccountId(accountId)
    },
    [setIsSendMax, updatePreferredSwapper, updateSelectedBuyAssetAccountId],
  )

  const isBelowMinSellAmount = useMemo(() => {
    const minSellAmount = toBaseUnit(
      bnOrZero(activeQuote?.minimumCryptoHuman),
      activeQuote?.steps[0].sellAsset.precision || 0,
    )

    return (
      bnOrZero(toBaseUnit(bnOrZero(sellAmountCryptoPrecision), sellAsset?.precision || 0)).lt(
        minSellAmount,
      ) &&
      hasValidSellAmount &&
      !isTradeQuotePending
    )
  }, [
    activeQuote?.minimumCryptoHuman,
    activeQuote?.steps,
    hasValidSellAmount,
    isTradeQuotePending,
    sellAmountCryptoPrecision,
    sellAsset?.precision,
  ])

  const feesExceedsSellAmount = useMemo(
    () =>
      bnOrZero(sellAmountCryptoPrecision).isGreaterThan(0) &&
      bnOrZero(buyAmountCryptoPrecision).isLessThanOrEqualTo(0) &&
      !isTradeQuotePending,
    [sellAmountCryptoPrecision, buyAmountCryptoPrecision, isTradeQuotePending],
  )

  const insufficientBalanceProtocolFeeMeta = useMemo(() => {
    if (protocolFees === undefined || tradeQuoteArgs === undefined || !buyAssetAccountId) return

    // This is an oversimplification where protocol fees are assumed to be only deducted from
    // account IDs corresponding to the sell asset account number and protocol fee asset chain ID.
    // Later we'll need to handle protocol fees payable from the buy side.
    const insufficientBalanceProtocolFees = Object.entries(protocolFees).filter(
      ([assetId, protocolFee]: [AssetId, ProtocolFee]) => {
        if (!protocolFee.requiresBalance) return false

        // TEMP: handle osmosis protocol fee payable on buy side for specific case until we implement general solution
        const accountId = isBuyingOsmoWithOmosisSwapper
          ? buyAssetAccountId
          : portfolioAccountIdByNumberByChainId[tradeQuoteArgs.accountNumber][
              protocolFee.asset.chainId
            ]
        const balanceCryptoBaseUnit = portfolioAccountBalancesBaseUnit[accountId][assetId]
        return bnOrZero(balanceCryptoBaseUnit).lt(protocolFee.amountCryptoBaseUnit)
      },
    )

    if (!insufficientBalanceProtocolFees[0]) return

    // UI can currently only show one error message at a time, so we show the first
    const protocolFee = insufficientBalanceProtocolFees[0][1]

    return {
      symbol: protocolFee.asset.symbol,
      chainName: chainAdapterManager.get(protocolFee.asset.chainId)?.getDisplayName(),
    }
  }, [
    protocolFees,
    tradeQuoteArgs,
    buyAssetAccountId,
    isBuyingOsmoWithOmosisSwapper,
    chainAdapterManager,
    portfolioAccountIdByNumberByChainId,
    portfolioAccountBalancesBaseUnit,
  ])

  const getErrorTranslationKey = useCallback((): string | [string, InterpolationOptions] => {
    const hasValidSellAssetBalance = bnOrZero(sellAssetBalancePrecision).gte(
      bnOrZero(sellAmountCryptoPrecision),
    )

    // when trading from fee asset, the value of TX in fee asset is deducted
    const tradeDeductionCryptoPrecision =
      sellFeeAsset?.assetId === sellAsset?.assetId ? bnOrZero(sellAmountCryptoPrecision) : bn(0)

    const hasEnoughBalanceForGas = bnOrZero(feeAssetBalancePrecision)
      .minus(
        networkFeeRequiresBalance
          ? fromBaseUnit(
              bnOrZero(activeQuote?.steps[0].feeData.networkFeeCryptoBaseUnit),
              sellFeeAsset?.precision,
            )
          : 0,
      )
      .minus(tradeDeductionCryptoPrecision)
      .gte(0)

    const minLimit = `${bnOrZero(activeQuote?.minimumCryptoHuman).decimalPlaces(6)} ${
      activeQuote?.steps[0].sellAsset.symbol
    }`

    if (isSwapperApiPending || !isSwapperApiInitiated) return 'common.loadingText'
    if (!wallet) return 'common.connectWallet'
    if (!walletSupportsSellAssetChain)
      return [
        'trade.errors.assetNotSupportedByWallet',
        {
          assetSymbol: sellAsset?.symbol ?? translate('trade.errors.sellAssetStartSentence'),
        },
      ]

    if (formErrors.input?.message && !walletSupportsBuyAssetChain) {
      return formErrors.input?.message.toString()
    }
    if (!receiveAddress)
      return [
        'trade.errors.noReceiveAddress',
        {
          assetSymbol: buyAsset?.symbol ?? translate('trade.errors.buyAssetMiddleSentence'),
        },
      ]
    if (!activeSwapper) return 'trade.errors.invalidTradePairBtnText'
    if (!isTradingActiveOnSellPool && activeSwapperName === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: sellAsset?.symbol ?? '',
        },
      ]
    }
    if (!isTradingActiveOnBuyPool && activeSwapperName === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: buyAsset?.symbol ?? '',
        },
      ]
    }

    if (!hasValidSellAssetBalance) return 'common.insufficientFunds'
    if (insufficientBalanceProtocolFeeMeta && walletSupportsBuyAssetChain) {
      return ['trade.errors.insufficientFundsForProtocolFee', insufficientBalanceProtocolFeeMeta]
    }
    if (hasValidSellAssetBalance && !hasEnoughBalanceForGas && hasValidSellAmount)
      return [
        'common.insufficientAmountForGas',
        {
          assetSymbol: sellFeeAsset?.symbol ?? translate('trade.errors.sellAssetMiddleSentence'),
        },
      ]
    if (isBelowMinSellAmount) {
      return activeSwapperName !== undefined &&
        [SwapperName.LIFI, SwapperName.OneInch].includes(activeSwapperName)
        ? 'trade.errors.amountTooSmallOrInvalidTradePair'
        : ['trade.errors.amountTooSmall', { minLimit }]
    }
    if (feesExceedsSellAmount) return 'trade.errors.sellAmountDoesNotCoverFee'
    if (isTradeQuotePending && quoteAvailableForCurrentAssetPair) return 'trade.updatingQuote'

    return 'trade.previewTrade'
  }, [
    sellAssetBalancePrecision,
    sellAmountCryptoPrecision,
    sellFeeAsset?.assetId,
    sellFeeAsset?.precision,
    sellFeeAsset?.symbol,
    sellAsset?.assetId,
    sellAsset?.symbol,
    feeAssetBalancePrecision,
    networkFeeRequiresBalance,
    activeQuote?.steps,
    activeQuote?.minimumCryptoHuman,
    isSwapperApiPending,
    isSwapperApiInitiated,
    wallet,
    walletSupportsSellAssetChain,
    translate,
    formErrors.input?.message,
    walletSupportsBuyAssetChain,
    receiveAddress,
    buyAsset?.symbol,
    activeSwapper,
    isTradingActiveOnSellPool,
    activeSwapperName,
    isTradingActiveOnBuyPool,
    insufficientBalanceProtocolFeeMeta,
    hasValidSellAmount,
    isBelowMinSellAmount,
    feesExceedsSellAmount,
    isTradeQuotePending,
    quoteAvailableForCurrentAssetPair,
  ])

  const hasError = useMemo(() => {
    switch (getErrorTranslationKey()) {
      case 'trade.previewTrade':
      case 'trade.updatingQuote':
      case 'common.loadingText':
        return false
      default:
        return true
    }
  }, [getErrorTranslationKey])

  const sellAmountTooSmall = useMemo(() => {
    switch (true) {
      case isBelowMinSellAmount:
      case feesExceedsSellAmount:
        return true
      default:
        return false
    }
  }, [isBelowMinSellAmount, feesExceedsSellAmount])

  const handleInputAssetClick = useCallback(
    (action: AssetClickAction) => {
      // prevent opening the asset selection while they are being populated
      if (!isSwapperInitialized) return

      assetSearch.open({
        onClick: (asset: Asset) => {
          setIsSendMax(false)
          updatePreferredSwapper(undefined)
          handleAssetClick(asset, action)
        },
        title: action === AssetClickAction.Sell ? 'trade.tradeFrom' : 'trade.tradeTo',
        assets:
          action === AssetClickAction.Sell
            ? supportedSellAssetsByMarketCap
            : supportedBuyAssetsByMarketCap,
      })
    },
    [
      assetSearch,
      isSwapperInitialized,
      supportedBuyAssetsByMarketCap,
      supportedSellAssetsByMarketCap,
      handleAssetClick,
      setIsSendMax,
      updatePreferredSwapper,
    ],
  )

  const handleSellAssetClick = useCallback(
    () => handleInputAssetClick(AssetClickAction.Sell),
    [handleInputAssetClick],
  )

  const handleBuyAssetClick = useCallback(
    () => handleInputAssetClick(AssetClickAction.Buy),
    [handleInputAssetClick],
  )

  const handleSwitchAssetsClick = useCallback(() => {
    setIsSendMax(false)
    updatePreferredSwapper(undefined)
    handleSwitchAssets()
  }, [handleSwitchAssets, setIsSendMax, updatePreferredSwapper])

  const tradeStateLoading = useMemo(
    () =>
      (isSwapperApiPending && !quoteAvailableForCurrentAssetPair) ||
      !isSwapperApiInitiated ||
      !isSwapperInitialized,
    [
      isSwapperApiPending,
      quoteAvailableForCurrentAssetPair,
      isSwapperApiInitiated,
      isSwapperInitialized,
    ],
  )

  const isSellAction = useMemo(() => {
    return (
      action === TradeAmountInputField.SELL_CRYPTO || action === TradeAmountInputField.SELL_FIAT
    )
  }, [action])

  const receiveAmountLoading = useMemo(
    () => isSwapperApiPending && isSellAction,
    [isSwapperApiPending, isSellAction],
  )

  const ManualReceiveAddressEntry: JSX.Element = useMemo(() => {
    return (
      <FormControl>
        <FormLabel color='white.500' w='full' fontWeight='bold'>
          {translate('trade.receiveAddress')}
        </FormLabel>
        <FormLabel color='yellow.400'>
          {translate('trade.receiveAddressDescription', { chainName: buyAssetChainName })}
        </FormLabel>
        <AddressInput
          rules={{
            required: true,
            validate: {
              validateAddress: async (rawInput: string) => {
                updateReceiveAddress(undefined)
                const value = rawInput.trim() // trim leading/trailing spaces
                setIsManualAddressEntryValidating(true)
                const { assetId, chainId } = buyAsset
                // this does not throw, everything inside is handled
                const parseAddressInputWithChainIdArgs = {
                  assetId,
                  chainId,
                  urlOrAddress: value,
                  disableUrlParsing: true,
                }
                const { address } = await parseAddressInputWithChainId(
                  parseAddressInputWithChainIdArgs,
                )
                setIsManualAddressEntryValidating(false)
                updateReceiveAddress(address || undefined)
                const invalidMessage = isYatSupported
                  ? 'common.invalidAddressOrYat'
                  : 'common.invalidAddress'
                return address ? true : invalidMessage
              },
            },
          }}
          placeholder={translate('trade.addressPlaceholder', { chainName: buyAssetChainName })}
        />
      </FormControl>
    )
  }, [buyAsset, buyAssetChainName, isYatSupported, translate, updateReceiveAddress])

  return (
    <SlideTransition>
      <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} width='full'>
            <TradeAssetSelect
              accountId={sellAssetAccountId}
              onAccountIdChange={handleSellAccountIdChange}
              assetId={sellAsset?.assetId}
              onAssetClick={handleSellAssetClick}
              label={translate('trade.from')}
            />
            <IconButton
              onClick={handleSwitchAssetsClick}
              isRound
              mx={{ base: 0, md: -3 }}
              my={{ base: -3, md: 0 }}
              size='sm'
              position='relative'
              borderColor={useColorModeValue('gray.100', 'gray.750')}
              borderWidth={1}
              boxShadow={`0 0 0 3px var(${useColorModeValue(
                '--chakra-colors-white',
                '--chakra-colors-gray-785',
              )})`}
              bg={useColorModeValue('white', 'gray.850')}
              zIndex={1}
              aria-label='Switch Assets'
              icon={isLargerThanMd ? <ArrowForwardIcon /> : <ArrowDownIcon />}
            />
            <TradeAssetSelect
              accountId={buyAssetAccountId}
              assetId={buyAsset?.assetId}
              onAssetClick={handleBuyAssetClick}
              onAccountIdChange={handleBuyAccountIdChange}
              accountSelectionDisabled={!swapperSupportsCrossAccountTrade}
              label={translate('trade.to')}
            />
          </Flex>
          <TradeAssetInput
            accountId={sellAssetAccountId}
            assetId={sellAsset?.assetId}
            assetSymbol={sellAsset?.symbol ?? ''}
            assetIcon={sellAsset?.icon ?? ''}
            cryptoAmount={positiveOrZero(sellAmountCryptoPrecision).toString()}
            fiatAmount={positiveOrZero(fiatSellAmount).toFixed(2)}
            isSendMaxDisabled={tradeStateLoading}
            onChange={onSellAssetInputChange}
            percentOptions={[1]}
            onPercentOptionClick={handleSendMax}
            showInputSkeleton={isSwapperApiPending && isSendMax}
            showFiatSkeleton={isSwapperApiPending && isSendMax}
            label={translate('trade.youPay')}
          />
          <TradeAssetInput
            isReadOnly={true}
            accountId={buyAssetAccountId}
            assetId={buyAsset?.assetId}
            assetSymbol={buyAsset?.symbol ?? ''}
            assetIcon={buyAsset?.icon ?? ''}
            cryptoAmount={positiveOrZero(buyAmountCryptoPrecision).toString()}
            fiatAmount={positiveOrZero(fiatBuyAmount).toFixed(2)}
            onChange={onBuyAssetInputChange}
            percentOptions={[1]}
            showInputSkeleton={receiveAmountLoading}
            showFiatSkeleton={receiveAmountLoading}
            label={translate('trade.youGet')}
            rightRegion={
              isTradeRatesEnabled && walletSupportsSellAssetChain ? (
                <IconButton
                  size='sm'
                  icon={showQuotes ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  aria-label='Expand Quotes'
                  onClick={toggleShowQuotes}
                />
              ) : (
                <></>
              )
            }
          >
            {isTradeRatesEnabled && walletSupportsSellAssetChain && (
              <TradeQuotes isOpen={showQuotes} isLoading={tradeStateLoading} />
            )}
          </TradeAssetInput>
        </Stack>
        <Stack boxShadow='sm' p={4} borderColor={borderColor} borderRadius='xl' borderWidth={1}>
          <RateGasRow
            sellSymbol={sellAsset?.symbol}
            buySymbol={buyAsset?.symbol}
            gasFee={gasFeeFiat}
            rate={activeQuote?.steps[0].rate}
            isLoading={tradeStateLoading}
            isError={!walletSupportsSellAssetChain}
          />
          {walletSupportsSellAssetChain && !sellAmountTooSmall && activeSwapperName ? (
            <ReceiveSummary
              isLoading={tradeStateLoading}
              symbol={buyAsset?.symbol ?? ''}
              amountCryptoPrecision={buyAmountCryptoPrecision ?? ''}
              amountBeforeFeesCryptoPrecision={quoteBuyAmountCryptoPrecision ?? ''}
              protocolFees={protocolFees}
              shapeShiftFee='0'
              slippage={slippage}
              swapperName={activeSwapperName}
            />
          ) : null}
        </Stack>
        {shouldShowManualReceiveAddressInput && !tradeStateLoading && ManualReceiveAddressEntry}
        <Button
          type='submit'
          colorScheme={hasError ? 'red' : 'blue'}
          size='lg-multiline'
          data-test='trade-form-preview-button'
          isDisabled={
            hasError ||
            isSwapperApiPending ||
            !hasValidSellAmount ||
            !activeQuote ||
            isManualAddressEntryValidating ||
            !isFormValid
          }
          isLoading={isLoading}
        >
          <Text translation={getErrorTranslationKey()} />
        </Button>
      </Stack>
    </SlideTransition>
  )
}
