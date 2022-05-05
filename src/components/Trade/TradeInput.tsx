import { Box, Button, FormControl, FormErrorMessage, IconButton, useToast } from '@chakra-ui/react'
import { AssetNamespace } from '@shapeshiftoss/caip'
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
import { TradeState } from 'components/Trade/Trade'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoHumanBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TradeAmountInputField } from './hooks/useSwapper/types'

type TS = TradeState<ChainTypes>

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
  const [quote, buyAsset, sellAsset, estimatedGasFees] = useWatch({
    name: ['quote', 'buyAsset', 'sellAsset', 'estimatedGasFees'],
  }) as Array<unknown> as [TS['quote'], TS['buyAsset'], TS['sellAsset'], TS['estimatedGasFees']]
  const { updateQuote, buildQuoteTx, checkApprovalNeeded, getFiatRate, getSendMaxAmount } =
    useSwapper()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: sellAsset?.currency?.assetId }),
  )
  const hasValidTradeBalance = bnOrZero(sellAssetBalance).gte(bnOrZero(sellAsset?.amount))
  const hasValidBalance = bnOrZero(sellAssetBalance).gt(0)

  const feeAsset = useAppSelector(state =>
    sellAsset
      ? selectFeeAssetById(state, sellAsset?.currency?.assetId)
      : selectAssetById(state, 'eip155:1/slip44:60'),
  )
  const feeAssetBalance = useAppSelector(state =>
    feeAsset
      ? selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: feeAsset?.assetId })
      : null,
  )

  // when trading from ETH, the value of TX in ETH is deducted
  const tradeDeduction =
    sellAsset && feeAsset && feeAsset.assetId === sellAsset.currency.assetId
      ? bnOrZero(sellAsset.amount)
      : bnOrZero(0)

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
    .minus(bnOrZero(estimatedGasFees))
    .minus(tradeDeduction)
    .gte(0)

  const onSubmit = async () => {
    if (!wallet) return
    if (!(quote?.sellAsset && quote?.buyAsset && sellAsset.amount)) return
    const isERC20 = sellAsset.currency.contractType === AssetNamespace.ERC20

    try {
      const fiatRate = await getFiatRate({ symbol: isERC20 ? 'ETH' : sellAsset.currency.symbol })

      if (isERC20) {
        const approvalNeeded = await checkApprovalNeeded(wallet)
        if (approvalNeeded) {
          history.push({
            pathname: '/trade/approval',
            state: {
              fiatRate,
            },
          })
          return
        }
      }

      const result = await buildQuoteTx({
        wallet,
        sellAsset: quote?.sellAsset,
        buyAsset: quote?.buyAsset,
        amount: sellAsset?.amount,
      })

      if (!result?.success && result?.statusReason) {
        handleToast(result.statusReason)
      }
      result?.success && history.push({ pathname: '/trade/confirm', state: { fiatRate } })
    } catch (err) {
      console.error(`TradeInput:onSubmit - ${err}`)
      handleToast(translate(TRADE_ERRORS.QUOTE_FAILED))
    }
  }

  const onSetMaxTrade = async () => {
    if (!wallet) return
    try {
      setIsSendMaxLoading(true)
      const maxSendAmount = await getSendMaxAmount({
        wallet,
        sellAsset,
        buyAsset,
        feeAsset,
      })
      const currentSellAsset = getValues('sellAsset')
      const currentBuyAsset = getValues('buyAsset')

      if (!maxSendAmount) return

      updateQuote({
        sellAsset: currentSellAsset,
        buyAsset: currentBuyAsset,
        feeAsset,
        action: TradeAmountInputField.SELL,
        amount: maxSendAmount,
      })
    } catch (err) {
      console.error(err)
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

  const switchAssets = () => {
    const currentSellAsset = getValues('sellAsset')
    const currentBuyAsset = getValues('buyAsset')
    setValue('action', TradeAmountInputField.SELL)
    setValue('sellAsset', currentBuyAsset)
    setValue('buyAsset', currentSellAsset)
    setValue('quote', undefined)
    updateQuote({
      amount: currentBuyAsset.amount ?? '0',
      sellAsset: currentBuyAsset,
      buyAsset: currentSellAsset,
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
  const error = errors?.quote?.value?.message ?? null

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
            <FormControl isInvalid={!!errors.fiatAmount}>
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
                          sellAsset,
                          buyAsset,
                          feeAsset,
                          action: TradeAmountInputField.FIAT,
                        })
                      }
                    }}
                  />
                )}
                name='fiatAmount'
                control={control}
                rules={{
                  validate: {
                    validNumber: value => !isNaN(Number(value)) || 'Amount must be a number',
                  },
                }}
              />
              <FormErrorMessage>{errors.fiatAmount && errors.fiatAmount.message}</FormErrorMessage>
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
                    sellAsset,
                    buyAsset,
                    feeAsset,
                    action: TradeAmountInputField.SELL,
                  })
                }}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push('/trade/select/sell')}
                    logo={sellAsset?.currency?.icon}
                    symbol={sellAsset?.currency?.symbol}
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
                onClick={switchAssets}
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
                    <RawText whiteSpace={'pre'}>{`1 ${sellAsset.currency?.symbol} = `}</RawText>
                    <NumberFormat
                      value={firstNonZeroDecimal(bnOrZero(quote?.rate))}
                      displayType={'text'}
                      thousandSeparator={true}
                    />
                    <RawText whiteSpace={'pre'}>{` ${buyAsset?.currency?.symbol}`}</RawText>
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
                    sellAsset,
                    buyAsset,
                    feeAsset,
                    action: TradeAmountInputField.BUY,
                  })
                }}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push('/trade/select/buy')}
                    logo={buyAsset?.currency?.icon}
                    symbol={buyAsset?.currency?.symbol}
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
