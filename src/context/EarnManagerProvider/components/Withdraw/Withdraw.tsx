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
  ModalBody,
  ModalFooter,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  useColorModeValue,
  VStack
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
import { SlideTransition } from 'components/SlideTransition'
import { Slippage } from 'components/Slippage/Slippage'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawProps = {
  asset: Asset
  // Estimated apy (Withdraw Only)
  apy: string
  // Users available amount
  cryptoAmountAvailable: string
  // Validation rules for the crypto input
  cryptoInputValidation?: ControllerProps['rules']
  // Users available amount
  fiatAmountAvailable: string
  // Validation rules for the fiat input
  fiatInputValidation?: ControllerProps['rules']
  // Asset market data
  marketData: MarketData
  // Array of the % options
  percentOptions: number[]
  onContinue(values: WithdrawValues): void
  onCancel(): void
}

const CryptoInput = (props: InputProps) => (
  <Input
    pr='4.5rem'
    pl='7.5rem'
    size='lg'
    type='number'
    border={0}
    borderBottomRadius={0}
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
  Slippage = 'slippage'
}

export type WithdrawValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.Slippage]: string
}

export const Withdraw = ({
  apy,
  asset,
  marketData,
  cryptoAmountAvailable,
  cryptoInputValidation,
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
      [Field.Slippage]: '0.5' // default slippage
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
        <ModalBody>
          <Card size='sm' width='full' variant='group' my={6}>
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
                <InputLeftElement ml={1} width='auto'>
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
                          decimalSeparator={localeParts.decimal}
                          inputMode='decimal'
                          thousandSeparator={localeParts.group}
                          value={value}
                          onChange={e => {
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
                          decimalSeparator={localeParts.decimal}
                          inputMode='decimal'
                          thousandSeparator={localeParts.group}
                          value={bnOrZero(value).toFixed(2)}
                          onChange={e => {
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
                        {/* TODO translate */}
                        <Text fontSize='sm' translation='modals.withdraw.slippageSettings' />
                      </PopoverHeader>
                      <PopoverBody>
                        <Slippage
                          onChange={handleSlippageChange}
                          value={values?.slippage || '0.5'}
                        />
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </InputRightElement>
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
        </ModalBody>
        <ModalFooter flexDir='column'>
          <Text
            fontSize='sm'
            color='gray.500'
            mb={2}
            width='full'
            textAlign='center'
            translation='modals.withdraw.footerDisclaimer'
          />
          <Button
            colorScheme={fieldError ? 'red' : 'blue'}
            isDisabled={!isValid}
            mb={2}
            size='lg'
            type='submit'
            width='full'
          >
            {translate(fieldError || 'common.continue')}
          </Button>
          <Button onClick={onCancel} size='lg' variant='ghost' width='full'>
            {translate('common.cancel')}
          </Button>
        </ModalFooter>
      </Box>
    </SlideTransition>
  )
}
