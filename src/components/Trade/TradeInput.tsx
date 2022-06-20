import { Box, Button, FormControl, FormErrorMessage, IconButton, useToast } from '@chakra-ui/react'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useState } from 'react'
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
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { firstNonZeroDecimal, fromBaseUnit, toBaseUnit } from 'lib/math'
import { selectPortfolioCryptoHumanBalanceByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
    number: { localeParts },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [isSendMaxLoading, setIsSendMaxLoading] = useState<boolean>(false)
  const [quote, buyTradeAsset, sellTradeAsset, feeAssetFiatRate] = useWatch({
    name: ['quote', 'buyAsset', 'sellAsset', 'feeAssetFiatRate'],
  }) as [TS['quote'], TS['buyAsset'], TS['sellAsset'], TS['feeAssetFiatRate']]
  const { updateQuote, checkApprovalNeeded, getSendMaxAmount, updateTrade, feeAsset } = useSwapper()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, {
      assetId: sellTradeAsset?.asset?.assetId ?? '',
    }),
  )
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
    feeAsset?.assetId === sellTradeAsset?.asset?.assetId
      ? bnOrZero(sellTradeAsset.amount)
      : bnOrZero(0)

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
    .minus(fromBaseUnit(bnOrZero(quote?.feeData.fee), feeAsset?.precision))
    .minus(tradeDeduction)
    .gte(0)

  const onSubmit = async () => {
    if (!(quote?.sellAsset && quote?.buyAsset && quote.sellAmount)) return

    const minSellAmount = toBaseUnit(quote.minimum, quote.sellAsset.precision)

    if (bnOrZero(quote.sellAmount).lt(minSellAmount)) {
      toast({
        description: translate('trade.errors.amountToSmall', {
          minLimit: `${quote.minimum} ${quote.sellAsset.symbol}`,
        }),
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
      return
    }

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
        await updateQuote({
          sellAsset: currentSellAsset.asset,
          buyAsset: currentBuyAsset.asset,
          feeAsset,
          action: TradeAmountInputField.SELL,
          amount: maxSendAmount,
        })
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

  const toggleAssets = () => {
    try {
      const currentSellAsset = getValues('sellAsset')
      const currentBuyAsset = getValues('buyAsset')
      if (!(currentSellAsset?.asset && currentBuyAsset?.asset)) return
      setValue('sellAsset', currentBuyAsset)
      setValue('buyAsset', currentSellAsset)
      updateQuote({
        forceQuote: true,
        amount: bnOrZero(currentBuyAsset.amount).toString(),
        sellAsset: currentBuyAsset.asset,
        buyAsset: currentSellAsset.asset,
        feeAsset,
        action: TradeAmountInputField.SELL,
      })
    } catch (e) {
      showErrorToast(e)
    }
  }

  const getTranslationKey = () => {
    if (!wallet) {
      return 'common.connectWallet'
    }

    if (isValid && !hasValidTradeBalance) {
      return 'common.insufficientFunds'
    }

    if (isValid && hasValidTradeBalance && !hasEnoughBalanceForGas && hasValidSellAmount) {
      return 'common.insufficientAmountForGas'
    }

    return error ?? 'trade.previewTrade'
  }

  // TODO:(ryankk) fix error handling
  const error = null

  const onTokenRowInputChange = (action: TradeAmountInputField) => (amount: string) => {
    if (sellTradeAsset?.asset && buyTradeAsset?.asset) {
      updateQuote({
        amount,
        sellAsset: sellTradeAsset.asset,
        buyAsset: buyTradeAsset.asset,
        feeAsset,
        action,
      })
    }
  }

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)} mb={2}>
        <Card variant='unstyled'>
          <Card.Header textAlign='center' px={0} pt={0}>
            <Card.Heading>
              <Text translation='assets.assetCards.assetActions.trade' />
            </Card.Heading>
          </Card.Header>
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
                    placeholder='$0.00'
                    mb={6}
                    fontSize='5xl'
                    isNumericString={true}
                    onValueChange={e => {
                      onChange(e.value)
                      if (e.value !== value && sellTradeAsset?.asset && buyTradeAsset?.asset) {
                        updateQuote({
                          amount: e.value,
                          sellAsset: sellTradeAsset.asset,
                          buyAsset: buyTradeAsset.asset,
                          feeAsset,
                          action: TradeAmountInputField.FIAT,
                        })
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
                }
                data-test='trade-form-token-input-row-sell'
              />
            </FormControl>
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
                isLoading={!!(!quote || error)}
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
                {!quote || error ? (
                  <Text translation={error ? 'common.error' : 'trade.searchingRate'} />
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
                error ||
                (isValid &&
                  (!hasEnoughBalanceForGas || !hasValidTradeBalance) &&
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
                !hasValidSellAmount
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
