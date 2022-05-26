import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputProps,
  InputRightElement,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Stack,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { Asset, MarketData } from '@shapeshiftoss/types'
import { useRef, useState } from 'react'
import { Controller, ControllerProps, useForm, useWatch } from 'react-hook-form'
import { FaBolt, FaClock } from 'react-icons/fa'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SliderIcon } from 'components/Icons/Slider'
import { SlideTransition } from 'components/SlideTransition'
import { Slippage } from 'components/Slippage/Slippage'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawProps = {
  asset: Asset
  // Users available amount
  cryptoAmountAvailable: string
  // Validation rules for the crypto input
  cryptoInputValidation?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
  // Users available amount
  fiatAmountAvailable: string
  // Validation rules for the fiat input
  fiatInputValidation?: ControllerProps['rules']
  // Asset market data
  marketData: MarketData
  // Array of the % options
  percentOptions: number[]
  // Show withdraw types
  enableWithdrawType?: boolean
  onContinue(values: WithdrawValues): void
  onCancel(): void
}

const CryptoInput = (props: InputProps) => (
  <Input
    pr='4.5rem'
    pl='1rem'
    ml='1rem'
    size='lg'
    type='number'
    border={0}
    borderBottomRadius={0}
    borderTopLeftRadius={0}
    placeholder='Enter amount'
    {...props}
  />
)

enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount',
  Slippage = 'slippage',
  WithdrawType = 'withdrawType'
}

export enum WithdrawType {
  Instant = 'instantUnstake',
  Delayed = 'unstake'
}

export type WithdrawValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.Slippage]: string
  [Field.WithdrawType]: WithdrawType
}

const DEFAULT_SLIPPAGE = '0.5'

export const Withdraw = ({
  asset,
  marketData,
  cryptoAmountAvailable,
  cryptoInputValidation,
  enableSlippage = true,
  enableWithdrawType = false,
  fiatAmountAvailable,
  fiatInputValidation,
  onContinue,
  onCancel,
  percentOptions
}: WithdrawProps) => {
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const translate = useTranslate()
  const [activeField, setActiveField] = useState<InputType>(InputType.Crypto)
  const [percent, setPercent] = useState<number | null>(null)
  const amountRef = useRef<string | null>(null)

  const {
    clearErrors,
    control,
    formState: { errors, isValid },
    handleSubmit,
    setError,
    setValue
  } = useForm<WithdrawValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: '',
      [Field.Slippage]: DEFAULT_SLIPPAGE,
      [Field.WithdrawType]: WithdrawType.Instant
    }
  })

  const values = useWatch({ control })
  const cryptoField = activeField === InputType.Crypto
  const cryptoError = errors?.cryptoAmount?.message ?? null
  const fiatError = errors?.fiatAmount?.message ?? null
  const fieldError = cryptoError || fiatError

  const handleInputToggle = () => {
    const field = cryptoField ? InputType.Fiat : InputType.Crypto
    if (fieldError) {
      // Toggles an existing error to the other field if present
      clearErrors(fiatError ? Field.FiatAmount : Field.CryptoAmount)
      setError(fiatError ? Field.CryptoAmount : Field.FiatAmount, {
        message: 'common.insufficientFunds'
      })
    }
    setActiveField(field)
  }

  const handleInputChange = (value: string) => {
    setPercent(null)
    if (cryptoField) {
      const fiat = bnOrZero(value).times(marketData.price)
      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
    } else {
      const crypto = bnOrZero(value).div(marketData.price)
      setValue(Field.CryptoAmount, crypto.toString(), { shouldValidate: true })
    }
  }

  const handlePercentClick = (_percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(_percent)
    const fiat = bnOrZero(cryptoAmount).times(marketData.price)
    if (cryptoField) {
      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    } else {
      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    }
    setPercent(_percent)
  }

  const handleSlippageChange = (value: string | number) => {
    setValue(Field.Slippage, String(value))
  }

  const onSubmit = (values: WithdrawValues) => {
    onContinue(values)
  }

  return (
    <SlideTransition>
      <Box as='form' maxWidth='lg' width='full' onSubmit={handleSubmit(onSubmit)}>
        <ModalBody py={6}>
          <Card size='sm' width='full' variant='group' mb={6}>
            <Card.Body>
              <Flex alignItems='center'>
                <AssetIcon src={asset.icon} boxSize='40px' />
                <Box ml={2}>
                  <RawText fontWeight='bold' lineHeight='1' mb={1}>
                    {asset.name}
                  </RawText>
                  <RawText color='gray.500' lineHeight='1'>
                    {asset.symbol}
                  </RawText>
                </Box>
                <Box ml='auto' textAlign='right'>
                  <Amount.Fiat
                    fontWeight='bold'
                    lineHeight='1'
                    mb={1}
                    value={fiatAmountAvailable}
                  />
                  <Amount.Crypto
                    color='gray.500'
                    lineHeight='1'
                    symbol={asset.symbol}
                    value={cryptoAmountAvailable}
                  />
                </Box>
              </Flex>
            </Card.Body>
          </Card>
          <FormControl mb={6}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <FormLabel color='gray.500'>
                {translate('modals.withdraw.amountToWithdraw')}
              </FormLabel>
              <FormHelperText
                mt={0}
                mr={3}
                mb={2}
                as='button'
                type='button'
                color='gray.500'
                onClick={handleInputToggle}
                textTransform='uppercase'
                _hover={{ color: 'gray.400', transition: '.2s color ease' }}
              >
                {/* This should display the opposite field */}
                {cryptoField ? (
                  <Amount.Fiat value={values?.fiatAmount || ''} />
                ) : (
                  <Amount.Crypto value={values?.cryptoAmount || ''} symbol={asset.symbol} />
                )}
              </FormHelperText>
            </Box>
            <VStack
              bg={useColorModeValue('gray.50', 'gray.850')}
              borderRadius='xl'
              borderWidth={1}
              borderColor={useColorModeValue('gray.100', 'gray.750')}
              divider={<Divider />}
              spacing={0}
            >
              <InputGroup size='lg'>
                <InputLeftElement pos='relative' ml={1} width='auto'>
                  <Button
                    ml={1}
                    size='sm'
                    variant='ghost'
                    textTransform='uppercase'
                    onClick={handleInputToggle}
                    width='full'
                  >
                    {cryptoField ? asset.symbol : 'USD'}
                  </Button>
                </InputLeftElement>
                {cryptoField && (
                  <Controller
                    render={({ field: { onChange, value } }) => {
                      return (
                        <NumberFormat
                          customInput={CryptoInput}
                          isNumericString={true}
                          decimalSeparator={localeParts.decimal}
                          inputMode='decimal'
                          thousandSeparator={localeParts.group}
                          value={value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            onChange(amountRef.current)
                            handleInputChange(amountRef.current as string)
                            amountRef.current = null
                          }}
                          onValueChange={e => {
                            amountRef.current = e.value
                          }}
                        />
                      )
                    }}
                    name={Field.CryptoAmount}
                    control={control}
                    rules={cryptoInputValidation}
                  />
                )}
                {!cryptoField && (
                  <Controller
                    render={({ field: { onChange, value } }) => {
                      return (
                        <NumberFormat
                          customInput={CryptoInput}
                          isNumericString={true}
                          decimalSeparator={localeParts.decimal}
                          inputMode='decimal'
                          thousandSeparator={localeParts.group}
                          value={bnOrZero(value).toFixed(2)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            onChange(amountRef.current)
                            if (amountRef.current) handleInputChange(amountRef.current)
                            amountRef.current = null
                          }}
                          onValueChange={e => {
                            amountRef.current = e.value
                          }}
                        />
                      )
                    }}
                    name={Field.FiatAmount}
                    control={control}
                    rules={fiatInputValidation}
                  />
                )}
                {enableSlippage && (
                  <InputRightElement>
                    <Popover>
                      <PopoverTrigger>
                        <IconButton
                          size='sm'
                          aria-label='Slippage Settings'
                          variant='ghost'
                          icon={<SliderIcon />}
                        />
                      </PopoverTrigger>
                      <PopoverContent width='sm'>
                        <PopoverArrow />
                        <PopoverCloseButton />
                        <PopoverHeader>
                          <Text fontSize='sm' translation='modals.withdraw.slippageSettings' />
                        </PopoverHeader>
                        <PopoverBody>
                          <Slippage
                            onChange={handleSlippageChange}
                            value={values?.slippage || DEFAULT_SLIPPAGE}
                          />
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                  </InputRightElement>
                )}
              </InputGroup>
              <ButtonGroup width='full' justifyContent='space-between' size='sm' px={4} py={2}>
                {percentOptions.map(option => (
                  <Button
                    isActive={option === percent}
                    key={option}
                    variant='ghost'
                    colorScheme='blue'
                    onClick={() => handlePercentClick(option)}
                  >
                    {option === 1 ? (
                      'Max'
                    ) : (
                      <Amount.Percent
                        value={option}
                        options={{
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }}
                      />
                    )}
                  </Button>
                ))}
              </ButtonGroup>
            </VStack>
          </FormControl>
          {enableWithdrawType && (
            <FormControl>
              <FormLabel color='gray.500'>{translate('modals.withdraw.withdrawType')}</FormLabel>
              <ButtonGroup colorScheme='blue' width='full' variant='input'>
                <Button
                  isFullWidth
                  flexDir='column'
                  height='auto'
                  py={4}
                  onClick={() => setValue(Field.WithdrawType, WithdrawType.Instant)}
                  isActive={values.withdrawType === WithdrawType.Instant}
                >
                  <Stack alignItems='center' spacing={1}>
                    <FaBolt size='30px' />
                    <RawText>{translate('modals.withdraw.instant')}</RawText>
                    <RawText color='gray.500' fontSize='sm'>
                      {translate('modals.withdraw.fee', { feeAmount: '20' })}
                    </RawText>
                  </Stack>
                </Button>
                <Button
                  isFullWidth
                  flexDir='column'
                  height='auto'
                  onClick={() => setValue(Field.WithdrawType, WithdrawType.Delayed)}
                  isActive={values.withdrawType === WithdrawType.Delayed}
                >
                  <HelperTooltip
                    label='Blah blah blah'
                    flexProps={{ position: 'absolute', right: 2, top: 2 }}
                  />
                  <Stack alignItems='center' spacing={1}>
                    <FaClock size='30px' />
                    <RawText>{translate('modals.withdraw.delayed')}</RawText>
                    <RawText color='gray.500' fontSize='sm'>
                      {translate('modals.withdraw.noFee')}
                    </RawText>
                  </Stack>
                </Button>
              </ButtonGroup>
              {values.withdrawType === WithdrawType.Delayed && (
                <Alert status='info' borderRadius='lg' mt={4}>
                  <AlertIcon />
                  <AlertDescription>
                    Once the time has elapsed you will be able to claim your withdraw amount.
                  </AlertDescription>
                </Alert>
              )}
            </FormControl>
          )}
        </ModalBody>
        <ModalFooter as={HStack} direction='horziontal' spacing={4}>
          <Text
            flex={1}
            fontSize='sm'
            color='gray.500'
            translation='modals.withdraw.footerDisclaimer'
          />
          <Button
            colorScheme={fieldError ? 'red' : 'blue'}
            isDisabled={!isValid}
            size='lg'
            type='submit'
          >
            {translate(
              fieldError || values.withdrawType === WithdrawType.Delayed
                ? 'modals.withdraw.requestWithdraw'
                : 'common.continue'
            )}
          </Button>
        </ModalFooter>
      </Box>
    </SlideTransition>
  )
}
