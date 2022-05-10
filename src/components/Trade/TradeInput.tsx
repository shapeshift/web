import { Box, Button, FormControl, FormErrorMessage, IconButton, useToast } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
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
import { TRADE_ERRORS, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import { selectPortfolioCryptoHumanBalanceByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TradeAmountInputField, TradeRoutePaths, TradeState } from './types'

type TS = TradeState<ChainTypes>

const moduleLogger = logger.child({ namespace: ['Trade', 'TradeInput'] })

export const TradeInput = ({ history }: RouterProps) => {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = useFormContext<TradeState<ChainTypes>>()
  const {
    number: { localeParts },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [isSendMaxLoading, setIsSendMaxLoading] = useState<boolean>(false)
  const [quote, buyTradeAsset, sellTradeAsset, sellAssetFiatRate] = useWatch({
    name: ['quote', 'buyAsset', 'sellAsset', 'sellAssetFiatRate'],
  }) as Array<unknown> as [TS['quote'], TS['buyAsset'], TS['sellAsset'], TS['sellAssetFiatRate']]
  const { updateQuote, checkApprovalNeeded, getSendMaxAmount, updateTrade, feeAsset } = useSwapper()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: sellTradeAsset?.asset?.assetId }),
  )
  const hasValidTradeBalance = bnOrZero(sellAssetBalance).gte(bnOrZero(sellTradeAsset?.amount))
  const hasValidBalance = bnOrZero(sellAssetBalance).gt(0)

  const feeAssetBalance = useAppSelector(state =>
    feeAsset
      ? selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: feeAsset?.assetId })
      : null,
  )

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
    if (!wallet) return
    if (!(quote?.sellAsset && quote?.buyAsset && quote.sellAmount)) return

    try {
      const result = await updateTrade({
        wallet,
        sellAsset: quote?.sellAsset,
        buyAsset: quote?.buyAsset,
        amount: quote?.sellAmount,
      })
      if (!result?.success && result?.statusReason) handleToast(result.statusReason)
      const approvalNeeded = await checkApprovalNeeded(wallet)
      if (approvalNeeded) {
        history.push({
          pathname: TradeRoutePaths.Approval,
          state: {
            fiatRate: sellAssetFiatRate,
          },
        })
        return
      }
      history.push({ pathname: TradeRoutePaths.Confirm, state: { fiatRate: sellAssetFiatRate } })
    } catch (err) {
      console.error(`TradeInput:onSubmit - ${err}`)
      handleToast(translate(TRADE_ERRORS.QUOTE_FAILED))
    }
  }

  const onSetMaxTrade = async () => {
    if (!wallet) return
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
        wallet,
        sellAsset: sellTradeAsset.asset,
        buyAsset: buyTradeAsset.asset,
        feeAsset,
      })
      const currentSellAsset = getValues('sellAsset')
      const currentBuyAsset = getValues('buyAsset')

      if (!maxSendAmount) return

      updateQuote({
        sellAsset: currentSellAsset.asset,
        buyAsset: currentBuyAsset.asset,
        feeAsset,
        action: TradeAmountInputField.SELL,
        amount: maxSendAmount,
      })
    } catch (e) {
      fnLogger.error(e, 'Building Quote Failed')
      handleToast(translate(TRADE_ERRORS.QUOTE_FAILED))
    } finally {
      setIsSendMaxLoading(false)
    }
  }

  const handleToast = (description: string) => {
    toast({
      description,
      status: 'error',
      duration: 9000,
      isClosable: true,
      position: 'top-right',
    })
  }

  const toggleAssets = () => {
    const currentSellAsset = getValues('sellAsset')
    const currentBuyAsset = getValues('buyAsset')
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
  }

  const getTranslationKey = () => {
    if (!wallet) {
      return 'common.connectWallet'
    }

    if (isValid && !hasValidTradeBalance) {
      return 'common.insufficientFunds'
    }

    if (isValid && hasValidTradeBalance && !hasEnoughBalanceForGas) {
      return 'common.insufficientAmountForGas'
    }

    return error ?? 'trade.previewTrade'
  }

  // TODO:(ryankk) fix error handling
  const error = null

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
                      if (e.value !== value) {
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
              <TokenRow<TradeState<ChainTypes>>
                control={control}
                fieldName='sellAsset.amount'
                disabled={isSendMaxLoading}
                rules={{ required: true }}
                onInputChange={(amount: string) => {
                  updateQuote({
                    amount,
                    sellAsset: sellTradeAsset.asset,
                    buyAsset: buyTradeAsset.asset,
                    feeAsset,
                    action: TradeAmountInputField.SELL,
                  })
                }}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push(TradeRoutePaths.SellSelect)}
                    logo={sellTradeAsset?.asset?.icon}
                    symbol={sellTradeAsset?.asset?.symbol}
                    data-test='token-row-sell-token-button'
                  />
                }
                inputRightElement={
                  <Button
                    h='1.75rem'
                    size='sm'
                    variant='ghost'
                    colorScheme='blue'
                    isDisabled={isSendMaxLoading || !hasValidBalance}
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
                isLoading={!quote || error ? true : false}
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
                    <RawText whiteSpace={'pre'}>{`1 ${sellTradeAsset.asset?.symbol} = `}</RawText>
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
              <TokenRow<TradeState<ChainTypes>>
                control={control}
                fieldName='buyAsset.amount'
                disabled={isSendMaxLoading}
                rules={{ required: true }}
                onInputChange={(amount: string) => {
                  updateQuote({
                    amount,
                    sellAsset: sellTradeAsset.asset,
                    buyAsset: buyTradeAsset.asset,
                    feeAsset,
                    action: TradeAmountInputField.BUY,
                  })
                }}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push(TradeRoutePaths.BuySelect)}
                    logo={buyTradeAsset?.asset?.icon}
                    symbol={buyTradeAsset?.asset?.symbol}
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
                error || (isValid && (!hasEnoughBalanceForGas || !hasValidTradeBalance))
                  ? 'red'
                  : 'blue'
              }
              isLoading={isSubmitting || isSendMaxLoading}
              isDisabled={
                !isDirty || !isValid || !wallet || !hasValidTradeBalance || !hasEnoughBalanceForGas
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
