import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputProps,
  InputRightElement,
  Link,
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
  VStack,
} from '@chakra-ui/react'
import { Asset, MarketData } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { useRef, useState } from 'react'
import { Controller, ControllerProps, useForm, useWatch } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { SliderIcon } from 'components/Icons/Slider'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Slippage } from 'components/Slippage/Slippage'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'

type DepositProps = {
  asset: Asset
  // Estimated apy (Deposit Only)
  apy: string
  // Users available amount
  cryptoAmountAvailable: string
  // Validation rules for the crypto input
  cryptoInputValidation?: ControllerProps['rules']
  // Users available amount
  fiatAmountAvailable: string
  // Validation rules for the fiat input
  fiatInputValidation?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
  // Asset market data
  marketData: MarketData
  // Array of the % options
  percentOptions: number[]
  onContinue(values: DepositValues): void
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
    borderRadius={0}
    placeholder='Enter amount'
    {...props}
  />
)

enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat',
}

enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount',
  Slippage = 'slippage',
}

export type DepositValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.Slippage]: string
}

const DEFAULT_SLIPPAGE = '0.5'

function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toString()
}

export const Deposit = ({
  apy,
  asset,
  marketData,
  cryptoAmountAvailable,
  cryptoInputValidation,
  fiatAmountAvailable,
  fiatInputValidation,
  enableSlippage = true,
  onContinue,
  percentOptions,
}: DepositProps) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const translate = useTranslate()
  const [activeField, setActiveField] = useState<InputType>(InputType.Crypto)
  const [percent, setPercent] = useState<number | null>(null)
  const amountRef = useRef<string | null>(null)
  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const {
    clearErrors,
    control,
    formState: { errors, isValid },
    handleSubmit,
    setError,
    setValue,
  } = useForm<DepositValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: '',
      [Field.Slippage]: DEFAULT_SLIPPAGE,
    },
  })

  const values = useWatch({ control })
  const cryptoField = activeField === InputType.Crypto
  const cryptoError = get(errors, 'cryptoAmount.message', null)
  const fiatError = get(errors, 'fiatAmount.message', null)
  const fieldError = cryptoError || fiatError

  const handleTosLink = () => {
    window.open('/legal/terms-of-service')
  }

  const handleInputToggle = () => {
    const field = cryptoField ? InputType.Fiat : InputType.Crypto
    if (fieldError) {
      // Toggles an existing error to the other field if present
      clearErrors(fiatError ? Field.FiatAmount : Field.CryptoAmount)
      setError(fiatError ? Field.CryptoAmount : Field.FiatAmount, {
        message: 'common.insufficientFunds',
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

  const onSubmit = (values: DepositValues) => {
    onContinue(values)
  }

  const cryptoYield = calculateYearlyYield(apy, values.cryptoAmount)
  const fiatYield = bnOrZero(cryptoYield).times(marketData.price).toFixed(2)

  return (
    <SlideTransition>
      <Box as='form' width='full' onSubmit={handleSubmit(onSubmit)}>
        <ModalBody display='flex' py={6} flexDir={{ base: 'column', md: 'row' }}>
          <Stack flex={1} spacing={6}>
            <Card size='sm' width='full' variant='group'>
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
                  {translate('modals.deposit.amountToDeposit')}
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
                bg={bgColor}
                borderRadius='xl'
                borderWidth={1}
                borderColor={borderColor}
                divider={<Divider />}
                spacing={0}
              >
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
                            maximumFractionDigits: 0,
                          }}
                        />
                      )}
                    </Button>
                  ))}
                </ButtonGroup>
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
                            onChange={() => {
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
                            onChange={() => {
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
                            <Text fontSize='sm' translation='modals.deposit.slippageSettings' />
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
                <Row px={4} py={4}>
                  <Row.Label>{translate('modals.deposit.estimatedReturns')}</Row.Label>
                  <Row.Value>
                    <Box textAlign='right'>
                      <Amount.Fiat value={fiatYield} fontWeight='bold' lineHeight='1' mb={1} />
                      <Amount.Crypto
                        value={cryptoYield}
                        symbol={asset.symbol}
                        color='gray.500'
                        lineHeight='1'
                      />
                    </Box>
                  </Row.Value>
                </Row>
                <FormHelperText pb={2}>
                  {translate('modals.deposit.estimateDisclaimer')}
                </FormHelperText>
              </VStack>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter as={Stack} direction={{ base: 'column', md: 'row' }}>
          <RawText color='gray.500' fontSize='sm' mb={2}>
            {translate('modals.deposit.footerDisclaimer')}
            <Link onClick={handleTosLink} color={useColorModeValue('blue.500', 'blue.200')}>
              {translate('modals.deposit.footerDisclaimerLink')}
            </Link>
          </RawText>
          <Button
            colorScheme={fieldError ? 'red' : 'blue'}
            isDisabled={!isValid}
            mb={2}
            size='lg'
            data-test='defi-modal-continue-button'
            type='submit'
          >
            {translate(fieldError || 'common.continue')}
          </Button>
        </ModalFooter>
      </Box>
    </SlideTransition>
  )
}
