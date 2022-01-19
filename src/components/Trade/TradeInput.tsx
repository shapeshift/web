import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputProps,
  useToast
} from '@chakra-ui/react'
import { ChainTypes, ContractTypes, SwapperType } from '@shapeshiftoss/types'
import { useState } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FaArrowsAltV } from 'react-icons/fa'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { RouterProps } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TokenButton } from 'components/TokenRow/TokenButton'
import { TokenRow } from 'components/TokenRow/TokenRow'
import {
  TRADE_ERRORS,
  TradeActions,
  useSwapper
} from 'components/Trade/hooks/useSwapper/useSwapper'
import { TradeState } from 'components/Trade/Trade'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'

const FiatInput = (props: InputProps) => (
  <Input
    variant='unstyled'
    size='xl'
    textAlign='center'
    fontSize='5xl'
    mb={6}
    placeholder='$0.00'
    {...props}
  />
)

type TS = TradeState<ChainTypes, SwapperType>

export const TradeInput = ({ history }: RouterProps) => {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isValid, isSubmitting }
  } = useFormContext<TradeState<ChainTypes, SwapperType>>()
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [isSendMaxLoading, setIsSendMaxLoading] = useState<boolean>(false)
  const [quote, action, buyAsset, sellAsset] = useWatch({
    name: ['quote', 'action', 'buyAsset', 'sellAsset']
  }) as Array<unknown> as [TS['quote'], TS['action'], TS['buyAsset'], TS['sellAsset']]
  const { getQuote, buildQuoteTx, reset, checkApprovalNeeded, getFiatRate, getSendMaxAmount } =
    useSwapper()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet }
  } = useWallet()

  const onSubmit = async () => {
    if (!wallet) return
    if (!(quote?.sellAsset && quote?.buyAsset && sellAsset.amount)) return
    const isERC20 = sellAsset.currency.contractType === ContractTypes.ERC20

    try {
      const fiatRate = await getFiatRate({ symbol: isERC20 ? 'ETH' : sellAsset.currency.symbol })

      if (isERC20) {
        const approvalNeeded = await checkApprovalNeeded(wallet)
        if (approvalNeeded) {
          history.push({
            pathname: '/trade/approval',
            state: {
              fiatRate
            }
          })
          return
        }
      }

      const result = await buildQuoteTx({
        wallet,
        sellAsset: quote?.sellAsset,
        buyAsset: quote?.buyAsset,
        amount: sellAsset?.amount
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

  const onSwapMax = async () => {
    if (!wallet) return
    try {
      setIsSendMaxLoading(true)
      const maxSendAmount = await getSendMaxAmount({ wallet, sellAsset, buyAsset })
      const action = TradeActions.SELL
      const currentSellAsset = getValues('sellAsset')
      const currentBuyAsset = getValues('buyAsset')

      if (!maxSendAmount) return

      await getQuote({
        sellAsset: currentSellAsset,
        buyAsset: currentBuyAsset,
        action,
        amount: maxSendAmount
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
      position: 'top-right'
    })
  }

  const switchAssets = () => {
    const currentSellAsset = getValues('sellAsset')
    const currentBuyAsset = getValues('buyAsset')
    const action = currentBuyAsset.amount ? TradeActions.SELL : undefined
    setValue('action', action)
    setValue('sellAsset', currentBuyAsset)
    setValue('buyAsset', currentSellAsset)
    setValue('quote', undefined)
    getQuote({
      amount: currentBuyAsset.amount ?? '0',
      sellAsset: currentBuyAsset,
      buyAsset: currentSellAsset,
      action
    })
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
                    customInput={FiatInput}
                    isNumericString={true}
                    onValueChange={e => {
                      onChange(e.value)
                      if (e.value !== value) {
                        const action = !!e.value ? TradeActions.FIAT : undefined
                        if (action) {
                          setValue('action', action)
                        } else reset()
                        getQuote({ amount: e.value, sellAsset, buyAsset, action })
                      }
                    }}
                  />
                )}
                name='fiatAmount'
                control={control}
                rules={{
                  validate: {
                    validNumber: value => !isNaN(Number(value)) || 'Amount must be a number'
                  }
                }}
              />
              <FormErrorMessage>{errors.fiatAmount && errors.fiatAmount.message}</FormErrorMessage>
            </FormControl>
            <FormControl>
              <TokenRow<TradeState<ChainTypes, SwapperType>>
                control={control}
                fieldName='sellAsset.amount'
                disabled={isSendMaxLoading}
                rules={{ required: true }}
                onInputChange={(amount: string) => {
                  if (!bn(amount).eq(bnOrZero(sellAsset.amount))) {
                    const action = amount ? TradeActions.SELL : undefined
                    action ? setValue('action', action) : reset()
                    getQuote({ amount, sellAsset, buyAsset, action })
                  }
                }}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push('/trade/select/sell')}
                    logo={sellAsset?.currency?.icon}
                    symbol={sellAsset?.currency?.symbol}
                  />
                }
                inputRightElement={
                  <Button
                    h='1.75rem'
                    size='sm'
                    variant='ghost'
                    colorScheme='blue'
                    isDisabled={isSendMaxLoading || !!action}
                    onClick={onSwapMax}
                  >
                    Max
                  </Button>
                }
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
                isLoading={!quote || action || error ? true : false}
                _loading={{ color: 'blue.500' }}
              />
              <Box display='flex' alignItems='center' color='gray.500' fontSize='sm' spacing='24px'>
                {!quote || action || error ? (
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
              <TokenRow<TradeState<ChainTypes, SwapperType>>
                control={control}
                fieldName='buyAsset.amount'
                disabled={isSendMaxLoading}
                rules={{ required: true }}
                onInputChange={(amount: string) => {
                  const action = amount ? TradeActions.BUY : undefined
                  action ? setValue('action', action) : reset()
                  getQuote({ amount, sellAsset, buyAsset, action })
                }}
                inputLeftElement={
                  <TokenButton
                    onClick={() => history.push('/trade/select/buy')}
                    logo={buyAsset?.currency?.icon}
                    symbol={buyAsset?.currency?.symbol}
                  />
                }
              />
            </FormControl>
            <Button
              type='submit'
              size='lg'
              width='full'
              colorScheme={error ? 'red' : 'blue'}
              isLoading={isSubmitting || isSendMaxLoading || !!action}
              isDisabled={!isDirty || !isValid || !!action || !wallet}
              style={{
                whiteSpace: 'normal',
                wordWrap: 'break-word'
              }}
            >
              <Text
                translation={!wallet ? 'common.connectWallet' : error ?? 'trade.previewTrade'}
              />
            </Button>
          </Card.Body>
        </Card>
      </Box>
    </SlideTransition>
  )
}
