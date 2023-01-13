import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, IconButton, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { ethAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import { useIsTradingActive } from 'components/Trade/hooks/useIsTradingActive'
import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getSendMaxAmount } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperService } from 'components/Trade/hooks/useSwapperService'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
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

import { RateGasRow } from './Components/RateGasRow'
import type { TradeAssetInputProps } from './Components/TradeAssetInput'
import { TradeAssetInput } from './Components/TradeAssetInput'
import { AssetClickAction, useTradeRoutes } from './hooks/useTradeRoutes/useTradeRoutes'
import { ReceiveSummary } from './TradeConfirm/ReceiveSummary'
import type { TS } from './types'
import { type TradeState, TradeAmountInputField, TradeRoutePaths } from './types'

const moduleLogger = logger.child({ namespace: ['TradeInput'] })

export const TradeInput = () => {
  useSwapperService()
  const [isLoading, setIsLoading] = useState(false)

  const { setTradeAmountsUsingExistingData, setTradeAmountsRefetchData } = useTradeAmounts()
  const { isTradingActiveOnSellPool } = useIsTradingActive()
  const {
    checkApprovalNeeded,
    getTrade,
    bestTradeSwapper,
    getSupportedSellableAssets,
    getSupportedBuyAssetsFromSellAsset,
    swapperSupportsCrossAccountTrade,
  } = useSwapper()
  const { receiveAddress } = useReceiveAddress()
  const translate = useTranslate()
  const history = useHistory()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const { control, setValue, getValues, handleSubmit } = useFormContext<TS>()
  const {
    state: { wallet },
  } = useWallet()
  const tradeAmountConstants = useGetTradeAmounts()
  const { assetSearch } = useModal()
  const { handleAssetClick } = useTradeRoutes()

  // Watched form fields
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const quote = useWatch({ control, name: 'quote' })
  const feeAssetFiatRate = useWatch({ control, name: 'feeAssetFiatRate' })
  const fees = useWatch({ control, name: 'fees' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const buyAssetAccountId = useWatch({ control, name: 'buyAssetAccountId' })
  const fiatSellAmount = useWatch({ control, name: 'fiatSellAmount' })
  const fiatBuyAmount = useWatch({ control, name: 'fiatBuyAmount' })
  const slippage = useWatch({ control, name: 'slippage' })

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
      setValue('amount', amount)
      setValue('action', action)
      // If we've overridden the input we are no longer in sendMax mode
      setValue('isSendMax', false)

      if (isSwapperApiPending && !quoteAvailableForCurrentAssetPair) {
        await setTradeAmountsRefetchData({ amount, action })
      } else {
        setTradeAmountsUsingExistingData({ amount, action })
      }
    },
    [
      setValue,
      isSwapperApiPending,
      quoteAvailableForCurrentAssetPair,
      setTradeAmountsRefetchData,
      setTradeAmountsUsingExistingData,
    ],
  )

  const handleToggle = useCallback(() => {
    try {
      const currentValues = Object.freeze(getValues())
      const currentSellTradeAsset = currentValues.sellTradeAsset
      const currentBuyTradeAsset = currentValues.buyTradeAsset
      if (!(currentSellTradeAsset && currentBuyTradeAsset)) return

      setValue('buyTradeAsset', { asset: currentSellTradeAsset.asset, amountCryptoPrecision: '0' })
      setValue('sellTradeAsset', { asset: currentBuyTradeAsset.asset, amountCryptoPrecision: '0' })
      setValue('fiatSellAmount', '0')
      setValue('fiatBuyAmount', '0')
      setValue('buyAssetFiatRate', currentValues.sellAssetFiatRate)
      setValue('sellAssetFiatRate', currentValues.buyAssetFiatRate)

      // The below values all change on asset change. Clear them so no inaccurate data is shown in the UI.
      setValue('feeAssetFiatRate', undefined)
      setValue('quote', undefined)
      setValue('trade', undefined)
      setValue('fees', undefined)
    } catch (e) {
      moduleLogger.error(e, 'handleToggle error')
    }
  }, [getValues, setValue])

  const handleSendMax: TradeAssetInputProps['onPercentOptionClick'] = useCallback(async () => {
    if (!(sellTradeAsset?.asset && quote)) return
    const maxSendAmount = getSendMaxAmount(
      sellTradeAsset.asset,
      sellFeeAsset,
      quote,
      sellAssetBalanceCrypto,
    )
    setValue('action', TradeAmountInputField.SELL_CRYPTO)
    setValue('sellTradeAsset.amountCryptoPrecision', maxSendAmount)
    setValue('amount', maxSendAmount)
    setValue('isSendMax', true)

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
    quote,
    sellAssetBalanceCrypto,
    sellFeeAsset,
    sellTradeAsset?.asset,
    setTradeAmountsRefetchData,
    setValue,
  ])

  const onSubmit = useCallback(
    async (values: TradeState<KnownChainIds>) => {
      setIsLoading(true)
      moduleLogger.info(values, 'debugging logger')
      try {
        const isApproveNeeded = await checkApprovalNeeded()
        if (isApproveNeeded) {
          history.push({ pathname: TradeRoutePaths.Approval })
          return
        }
        const trade = await getTrade()
        setValue('trade', trade)
        history.push({ pathname: TradeRoutePaths.Confirm })
      } catch (e) {
        moduleLogger.error(e, 'onSubmit error')
      } finally {
        setIsLoading(false)
      }
    },
    [checkApprovalNeeded, getTrade, history, setValue],
  )

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
    setValue('selectedSellAssetAccountId', accountId)

  const handleBuyAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    setValue('selectedBuyAssetAccountId', accountId)

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
        <Stack spacing={0}>
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
            onAssetClick={() => handleInputAssetClick(AssetClickAction.Sell)}
            onAccountIdChange={handleSellAccountIdChange}
            showFiatSkeleton={isUsdRatesPending}
          />
          <Stack justifyContent='center' alignItems='center'>
            <IconButton
              onClick={handleToggle}
              isRound
              my={-3}
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
              icon={<ArrowDownIcon />}
            />
          </Stack>
          <TradeAssetInput
            accountId={buyAssetAccountId}
            assetId={buyTradeAsset?.asset?.assetId}
            assetSymbol={buyTradeAsset?.asset?.symbol ?? ''}
            assetIcon={buyTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={positiveOrZero(buyTradeAsset?.amountCryptoPrecision).toString()}
            fiatAmount={positiveOrZero(fiatBuyAmount).toString()}
            onChange={onBuyAssetInputChange}
            percentOptions={[1]}
            onAssetClick={() => handleInputAssetClick(AssetClickAction.Buy)}
            onAccountIdChange={handleBuyAccountIdChange}
            accountSelectionDisabled={!swapperSupportsCrossAccountTrade}
            showInputSkeleton={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
            showFiatSkeleton={isSwapperApiPending && !quoteAvailableForCurrentAssetPair}
          />
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
