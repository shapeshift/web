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
import { get } from 'lodash'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { RouterProps } from 'react-router-dom'
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
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
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

export const TradeInput = ({ history }: RouterProps) => {
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isDirty, isValid }
  } = useFormContext()
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [quote, action, buyAsset, sellAsset] = useWatch({
    name: ['quote', 'action', 'buyAsset', 'sellAsset']
  })
  const { getQuote, buildQuoteTx, reset, checkApprovalNeeded, getFiatRate } = useSwapper()
  const {
    state: { wallet }
  } = useWallet()

  const onSubmit = async () => {
    if (wallet) {
      const formattedSellAsset = { ...quote.sellAsset, amount: sellAsset.amount }
      const formattedBuyAsset = { ...quote.buyAsset }
      try {
        const approvalNeeded = await checkApprovalNeeded(wallet)
        const ethFiatRate = await getFiatRate({
          symbol: 'ETH'
        })
        if (approvalNeeded) {
          history.push({
            pathname: '/trade/approval',
            state: {
              ethFiatRate
            }
          })
        } else {
          const result = await buildQuoteTx({
            wallet,
            sellAsset: formattedSellAsset,
            buyAsset: formattedBuyAsset
          })
          result?.success && history.push({ pathname: '/trade/confirm', state: { ethFiatRate } })
        }
      } catch (e) {
        setError('buildQuote', { message: TRADE_ERRORS.NO_LIQUIDITY })
      }
    }
  }

  const switchAssets = () => {
    const currentSellAsset = getValues('sellAsset')
    const currentBuyAsset = getValues('buyAsset')
    const action = currentBuyAsset.amount ? TradeActions.SELL : undefined
    setValue('sellAsset', currentBuyAsset)
    setValue('buyAsset', currentSellAsset)
    setValue('quote', undefined)
    setValue('action', action)
    getQuote({ sellAmount: currentBuyAsset.amount }, currentBuyAsset, currentSellAsset)
  }

  const error = get(errors, `useSwapper.message`, null)

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
                value={value}
                customInput={FiatInput}
                onValueChange={e => {
                  onChange(e.value)
                  if (e.value !== value) {
                    const action = !!e.value ? TradeActions.FIAT : undefined
                    if (action) {
                      setValue('action', action)
                    } else reset()
                    getQuote({ fiatAmount: e.value }, sellAsset, buyAsset)
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
          <TokenRow
            control={control}
            fieldName='sellAsset.amount'
            rules={{ required: true }}
            onInputChange={(value: string) => {
              const action = value ? TradeActions.SELL : undefined
              action ? setValue('action', action) : reset()
              getQuote({ sellAmount: value }, sellAsset, buyAsset)
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
          <IconButton onClick={switchAssets} aria-label='Switch' isRound icon={<ArrowDownIcon />} />
          <Box display='flex' alignItems='center' color='gray.500'>
            {!quote || action || error ? (
              <Text fontSize='sm' translation={error ? 'common.error' : 'trade.searchingRate'} />
            ) : (
              <>
                <RawText textAlign='right' fontSize='sm'>{`1 ${
                  sellAsset.currency?.symbol
                } = ${firstNonZeroDecimal(bn(quote.rate))} ${buyAsset?.currency?.symbol}`}</RawText>
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
            onInputChange={(value: string) => {
              const action = value ? TradeActions.BUY : undefined
              action ? setValue('action', action) : reset()
              const amount = action ? { buyAmount: value } : { sellAmount: value } // To get correct rate on empty field
              getQuote(amount, sellAsset, buyAsset)
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
          isDisabled={!isDirty || !isValid || !!action || !wallet}
          style={{
            whiteSpace: 'normal',
            wordWrap: 'break-word'
          }}
        >
          <Text translation={!wallet ? 'common.connectWallet' : error ?? 'trade.previewTrade'} />
        </Button>
      </Box>
    </SlideTransition>
  )
}
