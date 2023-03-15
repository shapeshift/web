import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Flex, IconButton, Stack, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { ethAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import { useIsTradingActive } from 'components/Trade/hooks/useIsTradingActive'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getSendMaxAmount } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperService } from 'components/Trade/hooks/useSwapperService'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import {
  selectSwapperApiPending,
  selectSwapperApiTradeQuotePending,
  selectSwapperApiUsdRatesPending,
} from 'state/apis/swapper/selectors'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import { breakpoints } from 'theme/theme'

import { TradeAssetSelect } from './Components/AssetSelection'
import { RateGasRow } from './Components/RateGasRow'
import type { TradeAssetInputProps } from './Components/TradeAssetInput'
import { TradeAssetInput } from './Components/TradeAssetInput'
import { TradeQuotes } from './Components/TradeQuotes/TradeQuotes'
import { AssetClickAction, useTradeRoutes } from './hooks/useTradeRoutes/useTradeRoutes'
import { ReceiveSummary } from './TradeConfirm/ReceiveSummary'
import { TradeAmountInputField, TradeRoutePaths } from './types'

const moduleLogger = logger.child({ namespace: ['TradeInput'] })

export const TradeInput = () => {
  useSwapperService()
  const [isLoading, setIsLoading] = useState(false)
  const [showQuotes, setShowQuotes] = useState(false)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isTradeRatesEnabled = useFeatureFlag('TradeRates')

  const { setTradeAmountsUsingExistingData, setTradeAmountsRefetchData } = useTradeAmounts()
  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = useIsTradingActive()

  const sellAssetAccountId = useSwapperStore(state => state.sellAssetAccountId)
  const buyAssetAccountId = useSwapperStore(state => state.buyAssetAccountId)
  const updateSelectedSellAssetAccountId = useSwapperStore(
    state => state.updateSelectedSellAssetAccountId,
  )
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const quote = useSwapperStore(state => state.quote)
  const fees = useSwapperStore(state => state.fees)
  const slippage = useSwapperStore(state => state.slippage)
  const updateFees = useSwapperStore(state => state.updateFees)
  const updateQuote = useSwapperStore(state => state.updateQuote)
  const updateTrade = useSwapperStore(state => state.updateTrade)
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateAmount = useSwapperStore(state => state.updateAmount)
  const fiatBuyAmount = useSwapperStore(state => state.buyAmountFiat)
  const fiatSellAmount = useSwapperStore(state => state.sellAmountFiat)
  const receiveAddress = useSwapperStore(state => state.receiveAddress)
  const updateIsSendMax = useSwapperStore(state => state.updateIsSendMax)
  const feeAssetFiatRate = useSwapperStore(state => state.feeAssetFiatRate)
  const buyAssetFiatRate = useSwapperStore(state => state.buyAssetFiatRate)
  const sellAssetFiatRate = useSwapperStore(state => state.sellAssetFiatRate)
  const updateFiatBuyAmount = useSwapperStore(state => state.updateBuyAmountFiat)
  const updateFiatSellAmount = useSwapperStore(state => state.updateSellAmountFiat)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const buyAsset = useSwapperStore(state => state.buyAsset)
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const buyAmountCryptoPrecision = useSwapperStore(state => state.buyAmountCryptoPrecision)
  const sellAmountCryptoPrecision = useSwapperStore(state => state.sellAmountCryptoPrecision)
  const updateBuyAsset = useSwapperStore(state => state.updateBuyAsset)
  const updateSellAsset = useSwapperStore(state => state.updateSellAsset)
  const updateBuyAmountCryptoPrecision = useSwapperStore(
    state => state.updateBuyAmountCryptoPrecision,
  )
  const updateSellAmountCryptoPrecision = useSwapperStore(
    state => state.updateSellAmountCryptoPrecision,
  )

  const {
    checkApprovalNeeded,
    getTrade,
    getSupportedSellableAssets,
    getSupportedBuyAssetsFromSellAsset,
    swapperSupportsCrossAccountTrade,
  } = useSwapper()
  const translate = useTranslate()
  const history = useHistory()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const { handleSubmit } = useFormContext()
  const {
    state: { wallet },
  } = useWallet()
  const tradeAmountConstants = useGetTradeAmounts()
  const { assetSearch } = useModal()
  const { handleAssetClick } = useTradeRoutes()

  // Selectors
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const bestTradeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const swapperName = useMemo(() => bestTradeSwapper?.name ?? '', [bestTradeSwapper])

  if (!sellFeeAsset) throw new Error(`Asset not found for AssetId ${sellAsset?.assetId}`)

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: sellFeeAsset?.assetId, accountId: sellAssetAccountId ?? '' }),
    [sellAssetAccountId, sellFeeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: sellAssetAccountId, assetId: sellAsset?.assetId ?? '' }),
    [sellAssetAccountId, sellAsset?.assetId],
  )
  const sellAssetBalanceCrypto = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, sellAssetBalanceFilter),
  )
  const sellAssetBalanceHuman = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, sellAssetBalanceFilter),
  )

  const isSwapperApiPending = useSelector(selectSwapperApiPending)
  const isTradeQuotePending = useSelector(selectSwapperApiTradeQuotePending)
  const isUsdRatesPending = useSelector(selectSwapperApiUsdRatesPending)

  const quoteAvailableForCurrentAssetPair = useMemo(() => {
    if (!quote) return false
    return (
      quote.buyAsset?.assetId === buyAsset?.assetId &&
      quote.sellAsset?.assetId === sellAsset?.assetId
    )
  }, [buyAsset?.assetId, quote, sellAsset?.assetId])

  // Constants
  const walletSupportsSellAssetChain =
    sellAsset?.chainId && walletSupportsChain({ wallet, chainId: sellAsset?.chainId })

  const walletSupportsBuyAssetChain =
    buyAsset?.chainId && walletSupportsChain({ wallet, chainId: buyAsset?.chainId })

  const walletSupportsTradeAssetChains = walletSupportsBuyAssetChain && walletSupportsSellAssetChain

  const gasFeeFiat = bnOrZero(fees?.networkFeeCryptoHuman)
    .times(bnOrZero(feeAssetFiatRate))
    .toString()

  const hasValidSellAmount = bnOrZero(sellAmountCryptoPrecision).gt(0)

  const handleInputChange = useCallback(
    async (action: TradeAmountInputField, amount: string) => {
      updateAction(action)
      // If we've overridden the input we are no longer in sendMax mode
      updateIsSendMax(false)
      updateAmount(amount)

      if (isSwapperApiPending && !quoteAvailableForCurrentAssetPair) {
        await setTradeAmountsRefetchData({ amount, action })
      } else {
        setTradeAmountsUsingExistingData({ amount, action })
      }
    },
    [
      updateAction,
      updateIsSendMax,
      updateAmount,
      isSwapperApiPending,
      quoteAvailableForCurrentAssetPair,
      setTradeAmountsRefetchData,
      setTradeAmountsUsingExistingData,
    ],
  )

  const handleToggle = useCallback(() => {
    try {
      const currentValues = Object.freeze({
        buyAsset,
        sellAsset,
        sellAssetFiatRate,
        buyAssetFiatRate,
      })
      const currentSellAsset = sellAsset
      const currentBuyAsset = buyAsset
      if (!(currentSellAsset && currentBuyAsset)) return

      updateSellAsset(currentBuyAsset)
      updateBuyAsset(currentSellAsset)
      updateSellAmountCryptoPrecision('0')
      updateBuyAmountCryptoPrecision('0')
      updateBuyAssetFiatRate(currentValues.sellAssetFiatRate)
      updateSellAssetFiatRate(currentValues.buyAssetFiatRate)

      // The below values all change on asset change. Clear them so no inaccurate data is shown in the UI.
      updateFiatSellAmount('0')
      updateFiatBuyAmount('0')
      updateFeeAssetFiatRate(undefined)
      updateQuote(undefined)
      updateFees(undefined)
      updateTrade(undefined)
    } catch (e) {
      moduleLogger.error(e, 'handleToggle error')
    }
  }, [
    buyAsset,
    sellAsset,
    sellAssetFiatRate,
    buyAssetFiatRate,
    updateSellAsset,
    updateBuyAsset,
    updateSellAmountCryptoPrecision,
    updateBuyAmountCryptoPrecision,
    updateBuyAssetFiatRate,
    updateSellAssetFiatRate,
    updateFiatSellAmount,
    updateFiatBuyAmount,
    updateFeeAssetFiatRate,
    updateQuote,
    updateFees,
    updateTrade,
  ])

  const handleSendMax: TradeAssetInputProps['onPercentOptionClick'] = useCallback(async () => {
    if (!(sellAsset && quote)) return
    const maxSendAmount = getSendMaxAmount(sellAsset, sellFeeAsset, quote, sellAssetBalanceCrypto)
    updateSellAmountCryptoPrecision(maxSendAmount)
    updateAction(TradeAmountInputField.SELL_CRYPTO)
    updateIsSendMax(true)
    updateAmount(maxSendAmount)

    // We need to get a fresh quote with the sendMax flag true
    await setTradeAmountsRefetchData({
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset?.assetId,
      amount: maxSendAmount,
      action: TradeAmountInputField.SELL_CRYPTO,
      sendMax: true,
    })
  }, [
    sellAsset,
    quote,
    sellFeeAsset,
    sellAssetBalanceCrypto,
    updateSellAmountCryptoPrecision,
    updateAction,
    updateIsSendMax,
    updateAmount,
    setTradeAmountsRefetchData,
    buyAsset?.assetId,
  ])

  const onSubmit = useCallback(async () => {
    setIsLoading(true)
    try {
      const isApprovalNeeded = await checkApprovalNeeded()
      if (isApprovalNeeded) {
        history.push({ pathname: TradeRoutePaths.Approval })
        return
      }
      const trade = await getTrade()
      updateTrade(trade)
      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      moduleLogger.error(e, 'onSubmit error')
    } finally {
      setIsLoading(false)
    }
  }, [checkApprovalNeeded, getTrade, history, updateTrade])

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

  const handleSellAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    updateSelectedSellAssetAccountId(accountId)

  const handleBuyAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    updateSelectedBuyAssetAccountId(accountId)

  const isBelowMinSellAmount = useMemo(() => {
    const minSellAmount = toBaseUnit(bnOrZero(quote?.minimum), quote?.sellAsset.precision || 0)

    return (
      bnOrZero(toBaseUnit(bnOrZero(sellAmountCryptoPrecision), sellAsset?.precision || 0)).lt(
        minSellAmount,
      ) &&
      hasValidSellAmount &&
      !isTradeQuotePending
    )
  }, [
    hasValidSellAmount,
    isTradeQuotePending,
    quote?.minimum,
    quote?.sellAsset.precision,
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

  const getErrorTranslationKey = useCallback((): string | [string, InterpolationOptions] => {
    const hasValidTradeBalance = bnOrZero(sellAssetBalanceHuman).gte(
      bnOrZero(sellAmountCryptoPrecision),
    )
    // when trading from ETH, the value of TX in ETH is deducted
    const tradeDeduction =
      sellFeeAsset?.assetId === sellAsset?.assetId ? bnOrZero(sellAmountCryptoPrecision) : bn(0)
    const shouldDeductNetworkFeeFromGasBalanceCheck = swapperName !== SwapperName.CowSwap
    const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
      .minus(
        shouldDeductNetworkFeeFromGasBalanceCheck
          ? fromBaseUnit(bnOrZero(quote?.feeData.networkFeeCryptoBaseUnit), sellFeeAsset?.precision)
          : 0,
      )
      .minus(tradeDeduction)
      .gte(0)

    const minLimit = `${bnOrZero(quote?.minimum).decimalPlaces(6)} ${quote?.sellAsset.symbol}`

    if (isSwapperApiPending) return 'common.loadingText'
    if (!wallet) return 'common.connectWallet'
    if (!walletSupportsSellAssetChain)
      return [
        'trade.errors.assetNotSupportedByWallet',
        {
          assetSymbol: sellAsset?.symbol ?? translate('trade.errors.sellAssetStartSentence'),
        },
      ]
    if (!walletSupportsBuyAssetChain)
      return [
        'trade.errors.assetNotSupportedByWallet',
        {
          assetSymbol: buyAsset?.symbol ?? translate('trade.errors.buyAssetStartSentence'),
        },
      ]
    if (!bestTradeSwapper) return 'trade.errors.invalidTradePairBtnText'
    if (!isTradingActiveOnSellPool && bestTradeSwapper.name === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: sellAsset?.symbol ?? '',
        },
      ]
    }
    if (!isTradingActiveOnBuyPool && bestTradeSwapper.name === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: buyAsset?.symbol ?? '',
        },
      ]
    }

    if (!hasValidTradeBalance) return 'common.insufficientFunds'
    if (hasValidTradeBalance && !hasEnoughBalanceForGas && hasValidSellAmount)
      return [
        'common.insufficientAmountForGas',
        {
          assetSymbol: sellFeeAsset?.symbol ?? translate('trade.errors.sellAssetMiddleSentence'),
        },
      ]
    if (isBelowMinSellAmount) return ['trade.errors.amountTooSmall', { minLimit }]
    if (feesExceedsSellAmount) return 'trade.errors.sellAmountDoesNotCoverFee'
    if (isTradeQuotePending && quoteAvailableForCurrentAssetPair) return 'trade.updatingQuote'
    if (!receiveAddress)
      return [
        'trade.errors.noReceiveAddress',
        {
          assetSymbol: buyAsset?.symbol ?? translate('trade.errors.buyAssetMiddleSentence'),
        },
      ]

    return 'trade.previewTrade'
  }, [
    bestTradeSwapper,
    buyAsset?.symbol,
    feeAssetBalance,
    feesExceedsSellAmount,
    hasValidSellAmount,
    isBelowMinSellAmount,
    isSwapperApiPending,
    isTradeQuotePending,
    isTradingActiveOnBuyPool,
    isTradingActiveOnSellPool,
    quote?.feeData.networkFeeCryptoBaseUnit,
    quote?.minimum,
    quote?.sellAsset.symbol,
    quoteAvailableForCurrentAssetPair,
    receiveAddress,
    sellAssetBalanceHuman,
    sellFeeAsset?.assetId,
    sellFeeAsset?.precision,
    sellFeeAsset?.symbol,
    sellAmountCryptoPrecision,
    sellAsset?.assetId,
    sellAsset?.symbol,
    translate,
    wallet,
    walletSupportsBuyAssetChain,
    walletSupportsSellAssetChain,
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
      assetSearch.open({
        onClick: (asset: Asset) => handleAssetClick(asset, action),
        title: action === AssetClickAction.Sell ? 'trade.tradeFrom' : 'trade.tradeTo',
        filterBy:
          action === AssetClickAction.Sell
            ? getSupportedSellableAssets
            : getSupportedBuyAssetsFromSellAsset,
      })
    },
    [assetSearch, getSupportedBuyAssetsFromSellAsset, getSupportedSellableAssets, handleAssetClick],
  )

  return (
    <SlideTransition>
      <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} width='full'>
            <TradeAssetSelect
              accountId={sellAssetAccountId}
              onAccountIdChange={handleSellAccountIdChange}
              assetId={sellAsset?.assetId}
              onAssetClick={() => handleInputAssetClick(AssetClickAction.Sell)}
              label={translate('trade.from')}
            />
            <IconButton
              onClick={handleToggle}
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
              onAssetClick={() => handleInputAssetClick(AssetClickAction.Buy)}
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
            fiatAmount={positiveOrZero(fiatSellAmount).toString()}
            isSendMaxDisabled={isSwapperApiPending || !quoteAvailableForCurrentAssetPair}
            onChange={onSellAssetInputChange}
            percentOptions={[1]}
            onPercentOptionClick={handleSendMax}
            showFiatSkeleton={isUsdRatesPending}
            label={translate('trade.youPay')}
          />
          <TradeAssetInput
            accountId={buyAssetAccountId}
            assetId={buyAsset?.assetId}
            assetSymbol={buyAsset?.symbol ?? ''}
            assetIcon={buyAsset?.icon ?? ''}
            cryptoAmount={positiveOrZero(buyAmountCryptoPrecision).toString()}
            fiatAmount={positiveOrZero(fiatBuyAmount).toString()}
            onChange={onBuyAssetInputChange}
            percentOptions={[1]}
            showInputSkeleton={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
            showFiatSkeleton={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
            label={translate('trade.youGet')}
            rightRegion={
              isTradeRatesEnabled ? (
                <IconButton
                  size='sm'
                  icon={showQuotes ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  aria-label='Expand Quotes'
                  onClick={() => setShowQuotes(!showQuotes)}
                />
              ) : (
                <></>
              )
            }
          >
            {isTradeRatesEnabled && (
              <TradeQuotes
                isOpen={showQuotes}
                isLoading={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
              />
            )}
          </TradeAssetInput>
        </Stack>
        <Stack boxShadow='sm' p={4} borderColor={borderColor} borderRadius='xl' borderWidth={1}>
          <RateGasRow
            sellSymbol={sellAsset?.symbol}
            buySymbol={buyAsset?.symbol}
            gasFee={gasFeeFiat}
            rate={quote?.rate}
            isLoading={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
            isError={!walletSupportsTradeAssetChains}
          />
          {walletSupportsTradeAssetChains && !sellAmountTooSmall ? (
            <ReceiveSummary
              isLoading={!quoteAvailableForCurrentAssetPair && isSwapperApiPending}
              symbol={buyAsset?.symbol ?? ''}
              amount={buyAmountCryptoPrecision ?? ''}
              beforeFees={tradeAmountConstants?.beforeFeesBuyAsset ?? ''}
              protocolFee={tradeAmountConstants?.totalTradeFeeBuyAsset ?? ''}
              shapeShiftFee='0'
              slippage={slippage}
              swapperName={swapperName}
            />
          ) : null}
        </Stack>
        <Button
          type='submit'
          colorScheme={hasError ? 'red' : 'blue'}
          size='lg-multiline'
          data-test='trade-form-preview-button'
          isDisabled={hasError || isSwapperApiPending || !hasValidSellAmount || !quote}
          isLoading={isLoading}
        >
          <Text translation={getErrorTranslationKey()} />
        </Button>
      </Stack>
    </SlideTransition>
  )
}
