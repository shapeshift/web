import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputProps
} from '@chakra-ui/react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { RouterProps } from 'react-router-dom'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TokenButton } from 'components/TokenRow/TokenButton'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'

import { TradeActions, useSwapper } from '../../hooks/useSwapper/useSwapper'

const FiatInput = (props: InputProps) => (
  <Input
    variant='unstyled'
    size='xl'
    textAlign='center'
    fontSize='3xl'
    mb={4}
    placeholder='$0.00'
    {...props}
  />
)

export const TradeInput = ({ history }: RouterProps) => {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isValid }
  } = useFormContext()
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [quote, action] = useWatch({ name: ['quote', 'action'] })
  const { getCryptoQuote, getFiatQuote, reset } = useSwapper()
  const buyAsset = getValues('buyAsset')
  const sellAsset = getValues('sellAsset')

  const onSubmit = () => {
    history.push('/trade/confirm')
  }

  const switchAssets = () => {
    const currentSellAsset = getValues('sellAsset')
    const currentBuyAsset = getValues('buyAsset')
    setValue('sellAsset', currentBuyAsset)
    setValue('buyAsset', currentSellAsset)
    setValue('action', TradeActions.SELL)
    getCryptoQuote(
      { sellAmount: currentBuyAsset.amount },
      currentBuyAsset,
      currentSellAsset,
      TradeActions.SELL
    )
  }

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)}>
        <FormControl isInvalid={!!errors.fiatAmount}>
          <Controller
            render={({ field: { onChange, value } }) => (
              <NumberFormat
                inputMode='decimal'
                thousandSeparator={localeParts.group}
                decimalSeparator={localeParts.decimal}
                prefix={localeParts.prefix}
                suffix={localeParts.postfix}
                disabled={!!action && action !== TradeActions.FIAT}
                value={value}
                customInput={FiatInput}
                onValueChange={e => {
                  onChange(e.value)
                  if (e.value !== value) {
                    const action = !!e.value ? TradeActions.FIAT : undefined
                    if (action) {
                      setValue('action', action)
                    } else reset()
                    getFiatQuote(e.value, sellAsset, buyAsset, action)
                  }
                }}
              />
            )}
            name='fiatAmount'
            control={control}
            rules={{
              validate: {
                validNumber: value => !isNaN(Number(value)) || 'Amount must be a number',
                greaterThanZero: value => Number(value) > 0 || 'Amount must be greater than 0'
              }
            }}
          />
          <FormErrorMessage>{errors.fiatAmount && errors.fiatAmount.message}</FormErrorMessage>
        </FormControl>
        <FormControl>
          <TokenRow
            control={control}
            fieldName='sellAsset.amount'
            rules={{ required: true }}
            disabled={action && action !== TradeActions.SELL}
            onInputChange={(value: string) => {
              const action = value ? TradeActions.SELL : undefined
              action ? setValue('action', action) : reset()
              getCryptoQuote({ sellAmount: value }, sellAsset, buyAsset, action)
            }}
            inputLeftElement={
              <TokenButton
                onClick={() => history.push('/trade/select/sell')}
                logo={sellAsset.currency?.icon}
                symbol={sellAsset.currency?.symbol}
              />
            }
            inputRightElement={
              <Button
                h='1.75rem'
                size='sm'
                variant='ghost'
                colorScheme='blue'
                onClick={() => console.info('max')}
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
            icon={<ArrowDownIcon />}
          />
          <Box display='flex' alignItems='center' color='gray.500'>
            {!quote || action ? (
              <Text fontSize='sm' translation='trade.searchingRate' />
            ) : (
              <>
                <RawText fontSize='sm'>{`1 ${sellAsset.currency?.symbol} = ${firstNonZeroDecimal(
                  bn(quote.rate)
                )} ${buyAsset.currency?.symbol}`}</RawText>
                <HelperTooltip label='The price is ' />
              </>
            )}
          </Box>
        </FormControl>
        <FormControl mb={6}>
          <TokenRow
            control={control}
            fieldName='buyAsset.amount'
            rules={{ required: true }}
            disabled={action && action !== TradeActions.BUY}
            onInputChange={(value: string) => {
              const action = value ? TradeActions.BUY : undefined
              action ? setValue('action', action) : reset()
              const amount = action ? { buyAmount: value } : { sellAmount: value } // To get correct rate on empty field
              getCryptoQuote(amount, sellAsset, buyAsset, action)
            }}
            inputLeftElement={
              <TokenButton
                onClick={() => history.push('/trade/select/buy')}
                logo={buyAsset.currency?.icon}
                symbol={buyAsset.currency?.symbol}
              />
            }
          />
        </FormControl>
        <Button
          type='submit'
          size='lg'
          width='full'
          colorScheme='blue'
          isDisabled={!isDirty || !isValid || !!action}
        >
          Preview Trade
        </Button>
      </Box>
    </SlideTransition>
  )
}
