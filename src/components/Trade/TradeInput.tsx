import { Box, Button, FormControl, FormErrorMessage, IconButton } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { SwapErrorTypes } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FaArrowsAltV } from 'react-icons/fa'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { RouterProps } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { FlexibleInputContainer } from 'components/FlexibleInputContainer/FlexibleInputContainer'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TokenButton } from 'components/TokenRow/TokenButton'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { ErrorTranslationMap, useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useInterval } from 'hooks/useInterval/useInterval'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectFiatToUsdRate,
  selectFirstAccountSpecifierByChainId,
  selectHighestFiatBalanceAccountByAssetId,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetAccountRow } from './AssetAccountRow'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from './types'

type TS = TradeState<KnownChainIds>

const moduleLogger = logger.child({ namespace: ['Trade', 'TradeInput'] })

export const TradeInput = ({ history }: RouterProps) => {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = useFormContext<TradeState<KnownChainIds>>()
  const {
    number: { localeParts, toFiat },
  } = useLocaleFormatter()
  const [isSendMaxLoading, setIsSendMaxLoading] = useState<boolean>(false)
  const [
    quote,
    buyTradeAsset,
    sellTradeAsset,
    feeAssetFiatRate,
    quoteError,
    sellAssetAccount,
    selectedAssetAccount,
    action,
    amount,
  ] = useWatch({
    name: [
      'quote',
      'buyAsset',
      'sellAsset',
      'feeAssetFiatRate',
      'quoteError',
      'sellAssetAccount',
      'selectedAssetAccount',
      'action',
      'amount',
    ],
  }) as [
    TS['quote'],
    TS['buyAsset'],
    TS['sellAsset'],
    TS['feeAssetFiatRate'],
    TS['quoteError'],
    TS['sellAssetAccount'],
    TS['selectedAssetAccount'],
    TS['action'],
    TS['amount'],
  ]
  const { updateQuote, checkApprovalNeeded, getSendMaxAmount, updateTrade, feeAsset } = useSwapper()
  const translate = useTranslate()
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const {
    state: { wallet },
  } = useWallet()

  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: sellTradeAsset?.asset?.assetId ?? '' }),
  )

  const shouldShowAccountSelection = sellTradeAsset?.asset && accountIds.length > 1

  useEffect(() => {
    if (!shouldShowAccountSelection) {
      // Cleanup selectedAssetAccount on component unmount when not in the context of a sell asset with multiple accounts
      setValue('selectedAssetAccount', undefined)
    }
  }, [setValue, shouldShowAccountSelection])

  const sellAssetId = sellTradeAsset?.asset?.assetId
  const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId ?? ''))
  const highestFiatBalanceAccount = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: sellAssetId ?? '',
    }),
  )

  const sellAssetAccountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, sellAsset?.chainId ?? ''),
  )
  const filter = useMemo(
    () => ({
      assetId: sellAssetId ?? '',
      accountId: sellAssetAccount ?? '',
      accountSpecifier: sellAssetAccountSpecifier,
    }),
    [sellAssetAccountSpecifier, sellAssetAccount, sellAssetId],
  )
  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, filter),
  )

  useEffect(
    () =>
      setValue(
        'sellAssetAccount',
        selectedAssetAccount ?? highestFiatBalanceAccount ?? sellAssetAccountSpecifier,
      ),
    [
      selectedAssetAccount,
      highestFiatBalanceAccount,
      setValue,
      sellTradeAsset,
      buyTradeAsset,
      sellAssetAccountSpecifier,
    ],
  )

  const updateQuoteClosure = useCallback(() => {
    const sellAssetChainId = sellAssetAccount ? fromAccountId(sellAssetAccount).chainId : undefined
    if (
      buyTradeAsset?.asset &&
      sellTradeAsset?.asset &&
      sellAssetAccount &&
      sellAssetChainId === sellTradeAsset.asset.chainId
    ) {
      updateQuote({
        forceQuote: true,
        amount: amount ?? '0',
        sellAsset: sellTradeAsset.asset,
        buyAsset: buyTradeAsset.asset,
        action: action ?? TradeAmountInputField.SELL,
        selectedCurrencyToUsdRate,
      })
    }
  }, [
    action,
    amount,
    buyTradeAsset?.asset,
    selectedCurrencyToUsdRate,
    sellAssetAccount,
    sellTradeAsset?.asset,
    updateQuote,
  ])

  // Refresh quote
  useEffect(() => {
    updateQuoteClosure()
  }, [updateQuoteClosure])

  // Update the quote every 30 seconds
  useInterval(() => updateQuoteClosure(), 1000 * 30)

  const hasValidTradeBalance = bnOrZero(sellAssetBalance).gte(bnOrZero(sellTradeAsset?.amount))
  const hasValidBalance = bnOrZero(sellAssetBalance).gt(0)
  const hasValidSellAmount = bnOrZero(sellTradeAsset?.amount).gt(0)

  const feeAssetBalance = useAppSelector(state =>
    feeAsset
      ? selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: feeAsset?.assetId })
      : null,
  )

  const { showErrorToast } = useErrorHandler()

  // when trading from ETH, the value of TX in ETH is deducted
  const tradeDeduction =
    feeAsset?.assetId === sellTradeAsset?.asset?.assetId ? bnOrZero(sellTradeAsset.amount) : bn(0)

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
    .minus(fromBaseUnit(bnOrZero(quote?.feeData.fee), feeAsset?.precision))
    .minus(tradeDeduction)
    .gte(0)

  const onSubmit = async () => {
    if (!(quote?.sellAsset && quote?.buyAsset && quote.sellAmount && sellAssetAccount)) return

    try {
      const approvalNeeded = await checkApprovalNeeded()
      if (approvalNeeded) {
        history.push({
          pathname: TradeRoutePaths.Approval,
          state: {
            fiatRate: feeAssetFiatRate,
          },
        })
        return
      }
      await updateTrade({
        sellAsset: quote?.sellAsset,
        buyAsset: quote?.buyAsset,
        amount: quote?.sellAmount,
      })
      history.push({ pathname: TradeRoutePaths.Confirm, state: { fiatRate: feeAssetFiatRate } })
    } catch (e) {
      showErrorToast(e)
    }
  }

  const onSetMaxTrade = async () => {
    if (!(sellTradeAsset?.asset && buyTradeAsset?.asset)) return
    const fnLogger = moduleLogger.child({ namespace: ['onSwapMax'] })

    try {
      setIsSendMaxLoading(true)
      fnLogger.trace(
        {
          fn: 'getSendMaxAmount',
          sellAsset: sellTradeAsset.asset,
          buyAsset: buyTradeAsset.asset,
          feeAsset,
        },
        'Getting Send Max Amount...',
      )
      const maxSendAmount = await getSendMaxAmount({
        sellAsset: sellTradeAsset.asset,
        buyAsset: buyTradeAsset.asset,
        feeAsset,
      })
      const currentSellAsset = getValues('sellAsset')
      const currentBuyAsset = getValues('buyAsset')

      if (currentSellAsset?.asset && currentBuyAsset?.asset) {
        setValue('action', TradeAmountInputField.SELL)
        setValue('amount', maxSendAmount)
      } else {
        fnLogger.error(
          {
            fn: 'getSendMaxAmount',
            sellAsset: currentBuyAsset?.asset,
            buyAsset: currentBuyAsset?.asset,
            feeAsset,
          },
          'Invalid assets',
        )
        return
      }
    } catch (e) {
      showErrorToast(e)
    } finally {
      setIsSendMaxLoading(false)
    }
  }

  const toggleAssets = useCallback(() => {
    const currentSellAsset = sellTradeAsset
    const currentBuyAsset = buyTradeAsset
    try {
      if (!(sellTradeAsset?.asset && buyTradeAsset?.asset)) return
      setValue('sellAsset', currentBuyAsset)
      setValue('buyAsset', currentSellAsset)
      setValue('selectedAssetAccount', undefined)
      setValue('sellAssetAccount', undefined)
      setValue('action', TradeAmountInputField.SELL)
      setValue('amount', bnOrZero(buyTradeAsset.amount).toString())
    } catch (e) {
      showErrorToast(e)
    }
  }, [buyTradeAsset, sellTradeAsset, setValue, showErrorToast])

  const getTranslationKey = () => {
    if (!wallet) {
      return 'common.connectWallet'
    }

    if (errors.quote) {
      return 'trade.errors.invalidTradePairBtnText'
    }

    if (isValid && !hasValidTradeBalance) {
      return 'common.insufficientFunds'
    }

    if (isValid && hasValidTradeBalance && !hasEnoughBalanceForGas && hasValidSellAmount) {
      return 'common.insufficientAmountForGas'
    }

    if (Boolean(quoteError)) {
      // Make interpolation arguments to cover all quote error translations that need interpolation
      const minLimit = `${bnOrZero(quote?.minimum).decimalPlaces(6)} ${quote?.sellAsset.symbol}`
      const interpolationArgs = { minLimit }

      const translation: [string, InterpolationOptions] = [
        ErrorTranslationMap[quoteError as SwapErrorTypes],
        interpolationArgs,
      ]
      return translation
    }

    return 'trade.previewTrade'
  }

  const onTokenRowInputChange = (action: TradeAmountInputField) => (amount: string) => {
    setValue('action', action)
    setValue('amount', amount)
  }

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)} mb={2}>
        <Card variant='unstyled'>
          <Card.Body pb={0} px={0}>
            <FormControl isInvalid={!!errors.fiatSellAmount}>
              <Controller
                render={({ field: { onChange, value } }) => (
                  <NumberFormat
                    inputMode='decimal'
                    thousandSeparator={localeParts.group}
                    decimalSeparator={localeParts.decimal}
                    prefix={localeParts.prefix}
                    suffix={localeParts.postfix}
                    value={value}
                    customInput={FlexibleInputContainer}
                    variant='unstyled'
                    textAlign='center'
                    placeholder={toFiat(0)}
                    mb={6}
                    fontSize='5xl'
                    isNumericString={true}
                    onValueChange={e => {
                      onChange(e.value)
                      if (e.value !== value && sellTradeAsset?.asset && buyTradeAsset?.asset) {
                        setValue('action', TradeAmountInputField.FIAT)
                        setValue('amount', e.value)
                      }
                    }}
                  />
                )}
                name='fiatSellAmount'
                control={control}
                rules={{
                  validate: {
                    validNumber: value => !isNaN(Number(value)) || 'Amount must be a number',
                  },
                }}
              />
              <FormErrorMessage>
                {errors.fiatSellAmount && errors.fiatSellAmount.message}
              </FormErrorMessage>
            </FormControl>
            <FormControl>
              <TokenRow<TradeState<KnownChainIds>>
                control={control}
                fieldName='sellAsset.amount'
                disabled={isSendMaxLoading}
                rules={{ required: true }}
                onInputChange={onTokenRowInputChange(TradeAmountInputField.SELL)}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push(TradeRoutePaths.SellSelect)}
                    logo={sellTradeAsset?.asset?.icon ?? ''}
                    symbol={sellTradeAsset?.asset?.symbol ?? ''}
                    data-test='token-row-sell-token-button'
                  />
                }
                inputRightElement={
                  !(wallet?.getVendor() === 'WalletConnect') ? (
                    <Button
                      h='1.75rem'
                      size='sm'
                      variant='ghost'
                      colorScheme='blue'
                      isDisabled={isSendMaxLoading || !hasValidBalance || !quote}
                      onClick={onSetMaxTrade}
                      data-test='token-row-sell-max-button'
                    >
                      Max
                    </Button>
                  ) : null
                }
                data-test='trade-form-token-input-row-sell'
              />
            </FormControl>
            {shouldShowAccountSelection && sellAssetAccount && (
              <AssetAccountRow
                accountId={sellAssetAccount}
                assetId={sellTradeAsset?.asset?.assetId}
                key={sellAssetAccount}
                onClick={() => history.push(TradeRoutePaths.AccountSelect)}
              />
            )}
            <FormControl
              rounded=''
              my={6}
              pl={6}
              pr={2}
              display='flex'
              alignItems='center'
              justifyContent='space-between'
            >
              <IconButton
                onClick={toggleAssets}
                aria-label='Switch'
                isRound
                icon={<FaArrowsAltV />}
                isLoading={!quote}
                _loading={{ color: 'blue.500' }}
                data-test='swap-assets-button'
              />
              <Box
                display='flex'
                alignItems='center'
                color='gray.500'
                fontSize='sm'
                data-test='trade-rate-quote'
              >
                {!quote ? (
                  <Text translation={'trade.searchingRate'} />
                ) : (
                  <>
                    <RawText whiteSpace={'pre'}>{`1 ${sellTradeAsset?.asset?.symbol} = `}</RawText>
                    <NumberFormat
                      value={firstNonZeroDecimal(bnOrZero(quote?.rate))}
                      displayType={'text'}
                      thousandSeparator={true}
                    />
                    <RawText whiteSpace={'pre'}>{` ${buyTradeAsset?.asset?.symbol}`}</RawText>
                    <HelperTooltip label={translate('trade.tooltip.rate')} />
                  </>
                )}
              </Box>
            </FormControl>
            <FormControl mb={6}>
              <TokenRow<TradeState<KnownChainIds>>
                control={control}
                fieldName='buyAsset.amount'
                disabled={isSendMaxLoading}
                rules={{ required: true }}
                onInputChange={onTokenRowInputChange(TradeAmountInputField.BUY)}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push(TradeRoutePaths.BuySelect)}
                    logo={buyTradeAsset?.asset?.icon || ''}
                    symbol={buyTradeAsset?.asset?.symbol || ''}
                    data-test='token-row-buy-token-button'
                  />
                }
                data-test='trade-form-token-input-row-buy'
              />
            </FormControl>
            <Button
              type='submit'
              size='lg'
              width='full'
              colorScheme={
                errors.quote ||
                (isValid &&
                  (!hasEnoughBalanceForGas || !hasValidTradeBalance || Boolean(quoteError)) &&
                  hasValidSellAmount)
                  ? 'red'
                  : 'blue'
              }
              isLoading={isSubmitting || isSendMaxLoading}
              isDisabled={
                !isDirty ||
                !isValid ||
                !wallet ||
                !hasValidTradeBalance ||
                !hasEnoughBalanceForGas ||
                !quote ||
                !hasValidSellAmount ||
                !!errors.quote ||
                Boolean(quoteError)
              }
              style={{
                whiteSpace: 'normal',
                wordWrap: 'break-word',
              }}
              data-test='trade-form-preview-button'
            >
              <Text translation={getTranslationKey()} />
            </Button>
          </Card.Body>
        </Card>
      </Box>
    </SlideTransition>
  )
}
