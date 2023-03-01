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
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
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

  const {
    dispatch: swapperDispatch,
    sellAssetAccountId,
    buyAssetAccountId,
    feeAssetFiatRate,
    fiatSellAmount,
    fiatBuyAmount,
    receiveAddress,
    slippage,
    quote,
    sellTradeAsset,
    buyTradeAsset,
    sellAssetFiatRate,
    buyAssetFiatRate,
    fees,
  } = useSwapperState()

  const {
    checkApprovalNeeded,
    getTrade,
    bestTradeSwapper,
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
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? ethAssetId),
  )

  if (!sellFeeAsset)
    throw new Error(`Asset not found for AssetId ${sellTradeAsset?.asset?.assetId}`)

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: sellFeeAsset?.assetId, accountId: sellAssetAccountId ?? '' }),
    [sellAssetAccountId, sellFeeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: sellAssetAccountId, assetId: sellTradeAsset?.asset?.assetId ?? '' }),
    [sellAssetAccountId, sellTradeAsset?.asset?.assetId],
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
      quote.buyAsset?.assetId === buyTradeAsset?.asset?.assetId &&
      quote.sellAsset?.assetId === sellTradeAsset?.asset?.assetId
    )
  }, [buyTradeAsset?.asset?.assetId, quote, sellTradeAsset?.asset?.assetId])

  // Constants
  const walletSupportsSellAssetChain =
    sellTradeAsset?.asset?.chainId &&
    walletSupportsChain({ wallet, chainId: sellTradeAsset?.asset?.chainId })

  const walletSupportsBuyAssetChain =
    buyTradeAsset?.asset?.chainId &&
    walletSupportsChain({ wallet, chainId: buyTradeAsset?.asset?.chainId })

  const walletSupportsTradeAssetChains = walletSupportsBuyAssetChain && walletSupportsSellAssetChain

  const gasFeeFiat = bnOrZero(fees?.networkFeeCryptoHuman)
    .times(bnOrZero(feeAssetFiatRate))
    .toString()

  const hasValidSellAmount = bnOrZero(sellTradeAsset?.amountCryptoPrecision).gt(0)

  const handleInputChange = useCallback(
    async (action: TradeAmountInputField, amount: string) => {
      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          action,
          // If we've overridden the input we are no longer in sendMax mode
          isSendMax: false,
          amount,
        },
      })

      if (isSwapperApiPending && !quoteAvailableForCurrentAssetPair) {
        await setTradeAmountsRefetchData({ amount, action })
      } else {
        setTradeAmountsUsingExistingData({ amount, action })
      }
    },
    [
      swapperDispatch,
      isSwapperApiPending,
      quoteAvailableForCurrentAssetPair,
      setTradeAmountsRefetchData,
      setTradeAmountsUsingExistingData,
    ],
  )

  const handleToggle = useCallback(() => {
    try {
      const currentValues = Object.freeze({
        sellTradeAsset,
        buyTradeAsset,
        sellAssetFiatRate,
        buyAssetFiatRate,
      })
      const currentSellTradeAsset = currentValues.sellTradeAsset
      const currentBuyTradeAsset = currentValues.buyTradeAsset
      if (!(currentSellTradeAsset && currentBuyTradeAsset)) return

      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          buyTradeAsset: { asset: currentSellTradeAsset.asset, amountCryptoPrecision: '0' },
          sellTradeAsset: { asset: currentBuyTradeAsset.asset, amountCryptoPrecision: '0' },
          fiatSellAmount: '0',
          fiatBuyAmount: '0',
          buyAssetFiatRate: currentValues.sellAssetFiatRate,
          sellAssetFiatRate: currentValues.buyAssetFiatRate,
          // The below values all change on asset change. Clear them so no inaccurate data is shown in the UI.
          feeAssetFiatRate: undefined,
          quote: undefined,
          fees: undefined,
          trade: undefined,
        },
      })
    } catch (e) {
      moduleLogger.error(e, 'handleToggle error')
    }
  }, [buyAssetFiatRate, buyTradeAsset, swapperDispatch, sellAssetFiatRate, sellTradeAsset])

  const handleSendMax: TradeAssetInputProps['onPercentOptionClick'] = useCallback(async () => {
    if (!(sellTradeAsset?.asset && quote)) return
    const maxSendAmount = getSendMaxAmount(
      sellTradeAsset.asset,
      sellFeeAsset,
      quote,
      sellAssetBalanceCrypto,
    )
    swapperDispatch({
      type: SwapperActionType.SET_VALUES,
      payload: {
        sellTradeAsset: { ...sellTradeAsset, amountCryptoPrecision: maxSendAmount },
        action: TradeAmountInputField.SELL_CRYPTO,
        isSendMax: true,
        amount: maxSendAmount,
      },
    })

    // We need to get a fresh quote with the sendMax flag true
    await setTradeAmountsRefetchData({
      sellAssetId: sellTradeAsset.asset.assetId,
      buyAssetId: buyTradeAsset?.asset?.assetId,
      amount: maxSendAmount,
      action: TradeAmountInputField.SELL_CRYPTO,
      sendMax: true,
    })
  }, [
    buyTradeAsset?.asset?.assetId,
    swapperDispatch,
    quote,
    sellAssetBalanceCrypto,
    sellFeeAsset,
    sellTradeAsset,
    setTradeAmountsRefetchData,
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
      swapperDispatch({ type: SwapperActionType.SET_VALUES, payload: { trade } })
      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      moduleLogger.error(e, 'onSubmit error')
    } finally {
      setIsLoading(false)
    }
  }, [checkApprovalNeeded, getTrade, history, swapperDispatch])

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
    swapperDispatch({
      type: SwapperActionType.SET_VALUES,
      payload: {
        selectedSellAssetAccountId: accountId,
      },
    })

  const handleBuyAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    swapperDispatch({
      type: SwapperActionType.SET_VALUES,
      payload: {
        selectedBuyAssetAccountId: accountId,
      },
    })

  const isBelowMinSellAmount = useMemo(() => {
    const minSellAmount = toBaseUnit(bnOrZero(quote?.minimum), quote?.sellAsset.precision || 0)

    return (
      bnOrZero(
        toBaseUnit(
          bnOrZero(sellTradeAsset?.amountCryptoPrecision),
          sellTradeAsset?.asset?.precision || 0,
        ),
      ).lt(minSellAmount) &&
      hasValidSellAmount &&
      !isTradeQuotePending
    )
  }, [
    hasValidSellAmount,
    isTradeQuotePending,
    quote?.minimum,
    quote?.sellAsset.precision,
    sellTradeAsset?.amountCryptoPrecision,
    sellTradeAsset?.asset?.precision,
  ])

  const feesExceedsSellAmount = useMemo(
    () =>
      bnOrZero(sellTradeAsset?.amountCryptoPrecision).isGreaterThan(0) &&
      bnOrZero(buyTradeAsset?.amountCryptoPrecision).isLessThanOrEqualTo(0) &&
      !isTradeQuotePending,
    [
      sellTradeAsset?.amountCryptoPrecision,
      buyTradeAsset?.amountCryptoPrecision,
      isTradeQuotePending,
    ],
  )

  const getErrorTranslationKey = useCallback((): string | [string, InterpolationOptions] => {
    const hasValidTradeBalance = bnOrZero(sellAssetBalanceHuman).gte(
      bnOrZero(sellTradeAsset?.amountCryptoPrecision),
    )
    // when trading from ETH, the value of TX in ETH is deducted
    const tradeDeduction =
      sellFeeAsset?.assetId === sellTradeAsset?.asset?.assetId
        ? bnOrZero(sellTradeAsset.amountCryptoPrecision)
        : bn(0)
    const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
      .minus(
        fromBaseUnit(bnOrZero(quote?.feeData.networkFeeCryptoBaseUnit), sellFeeAsset?.precision),
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
          assetSymbol:
            sellTradeAsset?.asset?.symbol ?? translate('trade.errors.sellAssetStartSentence'),
        },
      ]
    if (!walletSupportsBuyAssetChain)
      return [
        'trade.errors.assetNotSupportedByWallet',
        {
          assetSymbol:
            buyTradeAsset?.asset?.symbol ?? translate('trade.errors.buyAssetStartSentence'),
        },
      ]
    if (!bestTradeSwapper) return 'trade.errors.invalidTradePairBtnText'
    if (!isTradingActiveOnSellPool && bestTradeSwapper.name === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: sellTradeAsset?.asset?.symbol ?? '',
        },
      ]
    }
    if (!isTradingActiveOnBuyPool && bestTradeSwapper.name === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: buyTradeAsset?.asset?.symbol ?? '',
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
          assetSymbol:
            buyTradeAsset?.asset?.symbol ?? translate('trade.errors.buyAssetMiddleSentence'),
        },
      ]

    return 'trade.previewTrade'
  }, [
    bestTradeSwapper,
    buyTradeAsset?.asset?.symbol,
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
    sellTradeAsset?.amountCryptoPrecision,
    sellTradeAsset?.asset?.assetId,
    sellTradeAsset?.asset?.symbol,
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
  const swapperName = useMemo(() => bestTradeSwapper?.name ?? '', [bestTradeSwapper])

  return (
    <SlideTransition>
      <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} width='full'>
            <TradeAssetSelect
              accountId={sellAssetAccountId}
              onAccountIdChange={handleSellAccountIdChange}
              assetId={sellTradeAsset?.asset?.assetId}
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
              assetId={buyTradeAsset?.asset?.assetId}
              onAssetClick={() => handleInputAssetClick(AssetClickAction.Buy)}
              onAccountIdChange={handleBuyAccountIdChange}
              accountSelectionDisabled={!swapperSupportsCrossAccountTrade}
              label={translate('trade.to')}
            />
          </Flex>
          <TradeAssetInput
            accountId={sellAssetAccountId}
            assetId={sellTradeAsset?.asset?.assetId}
            assetSymbol={sellTradeAsset?.asset?.symbol ?? ''}
            assetIcon={sellTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={positiveOrZero(sellTradeAsset?.amountCryptoPrecision).toString()}
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
            assetId={buyTradeAsset?.asset?.assetId}
            assetSymbol={buyTradeAsset?.asset?.symbol ?? ''}
            assetIcon={buyTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={positiveOrZero(buyTradeAsset?.amountCryptoPrecision).toString()}
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
            sellSymbol={sellTradeAsset?.asset?.symbol}
            buySymbol={buyTradeAsset?.asset?.symbol}
            gasFee={gasFeeFiat}
            rate={quote?.rate}
            isLoading={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
            isError={!walletSupportsTradeAssetChains}
          />
          {walletSupportsTradeAssetChains && !sellAmountTooSmall ? (
            <ReceiveSummary
              isLoading={!quoteAvailableForCurrentAssetPair && isSwapperApiPending}
              symbol={buyTradeAsset?.asset?.symbol ?? ''}
              amount={buyTradeAsset?.amountCryptoPrecision ?? ''}
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
