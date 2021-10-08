import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputProps,
  Text
} from '@chakra-ui/react'
import { Controller, useFormContext } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { RouterProps } from 'react-router-dom'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SlideTransition } from 'components/SlideTransition'
import { TokenButton } from 'components/TokenRow/TokenButton'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useSwapper } from '../../hooks/useSwapper/useSwapper'
import { TradeState } from './Trade'
import { RawText } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'

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

enum FetchActions {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT'
}

export const TradeInput = ({ history }: RouterProps) => {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors, isDirty, isValid }
  } = useFormContext()
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const { getBuyAssetQuote, getSellAssetQuote, getFiatQuote } = useSwapper({
    setValue,
    ...(watch() as TradeState)
  })
  const action = getValues('action')
  const quote = getValues('quote')
  const buyAsset = getValues('buyAsset.currency')
  const sellAsset = getValues('sellAsset.currency')

  const onSubmit = () => {
    history.push('/trade/confirm')
  }

  console.log('fetch', action)

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
                disabled={!!action && action !== FetchActions.FIAT}
                value={value}
                customInput={FiatInput}
                onValueChange={e => {
                  onChange(e.value)
                  if (e.value !== value) {
                    setValue('action', FetchActions.FIAT)
                    getFiatQuote(e.value)
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
            disabled={!!action && action !== FetchActions.SELL}
            onInputChange={() => {
              setValue('action', FetchActions.SELL)
              getSellAssetQuote()
            }}
            inputLeftElement={
              <TokenButton
                onClick={() => history.push('/trade/select/sell')}
                logo={sellAsset?.icon}
                symbol={sellAsset?.symbol}
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
            onClick={() => {
              const sellAsset = getValues('sellAsset')
              const buyAsset = getValues('buyAsset')
              setValue('buyAsset', sellAsset)
              setValue('sellAsset', buyAsset)
            }}
            aria-label='Switch'
            isRound
            icon={<ArrowDownIcon />}
          />
          <Box display='flex' alignItems='center' color='gray.500'>
            {quote && (
              <RawText fontSize='sm'>{`1 ${sellAsset.symbol} = ${firstNonZeroDecimal(
                bn(quote.rate)
              )} ${buyAsset.symbol}`}</RawText>
            )}
            <HelperTooltip label='The price is ' />
          </Box>
        </FormControl>
        <FormControl mb={6}>
          <TokenRow
            control={control}
            fieldName='buyAsset.amount'
            rules={{ required: true }}
            disabled={!!action && action !== FetchActions.BUY}
            onInputChange={() => {
              setValue('action', FetchActions.BUY)
              getBuyAssetQuote()
            }}
            inputLeftElement={
              <TokenButton
                onClick={() => history.push('/trade/select/buy')}
                logo={buyAsset?.icon}
                symbol={buyAsset?.symbol}
              />
            }
          />
        </FormControl>
        <Button
          type='submit'
          size='lg'
          width='full'
          colorScheme='blue'
          isDisabled={!isDirty || !isValid}
        >
          Preview Trade
        </Button>
      </Box>
    </SlideTransition>
  )
}
