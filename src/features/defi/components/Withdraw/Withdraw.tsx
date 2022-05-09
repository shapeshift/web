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
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputProps,
  InputRightElement,
  List,
  ListItem,
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
import { Asset, MarketData, WithdrawType } from '@shapeshiftoss/types'
import { useRef, useState } from 'react'
import { Controller, ControllerProps, useForm, useWatch } from 'react-hook-form'
import { FaBolt, FaClock } from 'react-icons/fa'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { SliderIcon } from 'components/Icons/Slider'
import { SlideTransition } from 'components/SlideTransition'
import { Slippage } from 'components/Slippage/Slippage'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
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
  feePercentage?: string
  onContinue(values: WithdrawValues): void
  updateWithdraw?(values: Pick<WithdrawValues, Field.WithdrawType | Field.CryptoAmount>): void
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
    borderBottomLeftRadius={0}
    borderTopLeftRadius={0}
    borderTopRightRadius={0}
    placeholder='Enter amount'
    {...props}
  />
)

enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat',
}

export enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount',
  Slippage = 'slippage',
  WithdrawType = 'withdrawType',
}

export type WithdrawValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.Slippage]: string
  [Field.WithdrawType]: WithdrawType
}

const DEFAULT_SLIPPAGE = '0.5'

export const Withdraw: React.FC<WithdrawProps> = ({
  asset,
  marketData,
  cryptoAmountAvailable,
  cryptoInputValidation,
  enableSlippage = true,
  enableWithdrawType = false,
  fiatAmountAvailable,
  fiatInputValidation,
  onContinue,
  updateWithdraw,
  percentOptions,
  feePercentage,
  children,
}) => {
  const {
    number: { localeParts },
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
    setValue,
  } = useForm<WithdrawValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: '',
      [Field.Slippage]: DEFAULT_SLIPPAGE,
      [Field.WithdrawType]: WithdrawType.DELAYED,
    },
  })

  const values = useWatch({ control })

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

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
    setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount.toString(), {
      shouldValidate: true,
    })
  }

  const handleWithdrawalTypeClick = (withdrawType: WithdrawType) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).toString()

    if (withdrawType === WithdrawType.INSTANT) {
      const fiat = bnOrZero(cryptoAmount).times(marketData.price)

      setValue(Field.FiatAmount, fiat.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), {
        shouldValidate: true,
      })
      // TODO(0xdef1cafe): query the fee function from the liquidity reserve contract
      // this is correct as at 2022-04-27
      // https://etherscan.io/address/0x8EC637Fe2800940C7959f9BAd4fE69e41225CD39#readContract
      setPercent(2.5)
      setValue(Field.WithdrawType, WithdrawType.INSTANT)
    } else {
      setValue(Field.WithdrawType, WithdrawType.DELAYED)
    }

    updateWithdraw?.({ withdrawType, cryptoAmount })
  }

  const handleSlippageChange = (value: string | number) => {
    setValue(Field.Slippage, String(value))
  }

  const onSubmit = (values: WithdrawValues) => {
    if (!isConnected) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }
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
          {enableWithdrawType && (
            <FormControl mb={6}>
              <FormLabel color='gray.500'>{translate('modals.withdraw.withdrawType')}</FormLabel>
              <ButtonGroup colorScheme='blue' width='full' variant='input'>
                <Button
                  isFullWidth
                  flexDir='column'
                  height='auto'
                  py={4}
                  onClick={() => handleWithdrawalTypeClick(WithdrawType.INSTANT)}
                  isActive={values.withdrawType === WithdrawType.INSTANT}
                >
                  <Stack alignItems='center' spacing={1}>
                    <FaBolt size='30px' />
                    <RawText>{translate('modals.withdraw.instant')}</RawText>
                    <RawText color='gray.500' fontSize='sm'>
                      {translate('modals.withdraw.fee', {
                        fee: feePercentage ?? '0',
                        symbol: asset.symbol,
                      })}
                    </RawText>
                  </Stack>
                </Button>
                <Button
                  isFullWidth
                  flexDir='column'
                  height='auto'
                  onClick={() => handleWithdrawalTypeClick(WithdrawType.DELAYED)}
                  isActive={values.withdrawType === WithdrawType.DELAYED}
                >
                  <Stack alignItems='center' spacing={1}>
                    <FaClock size='30px' />
                    <RawText>{translate('modals.withdraw.delayed')}</RawText>
                    <RawText color='gray.500' fontSize='sm'>
                      {translate('modals.withdraw.noFee', {
                        symbol: asset.symbol,
                      })}
                    </RawText>
                  </Stack>
                </Button>
              </ButtonGroup>
              {values.withdrawType === WithdrawType.DELAYED && (
                <Alert status='info' borderRadius='lg' mt={4} alignItems='flex-start'>
                  <AlertIcon />
                  <Box>
                    <AlertDescription>{translate('modals.withdraw.info.delayed')}</AlertDescription>
                    <List mt={2} variant='numerList'>
                      <ListItem>{translate('modals.withdraw.info.delayedOne')}</ListItem>
                      <ListItem>{translate('modals.withdraw.info.delayedTwo')}</ListItem>
                    </List>
                  </Box>
                </Alert>
              )}
              {values.withdrawType === WithdrawType.INSTANT && (
                <Alert status='info' borderRadius='lg' mt={4}>
                  <AlertIcon />
                  <AlertDescription>{translate('modals.withdraw.info.instant')}</AlertDescription>
                </Alert>
              )}
            </FormControl>
          )}
          <FormControl>
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
              <ButtonGroup width='full' justifyContent='space-between' size='sm' px={4} py={2}>
                {percentOptions.map(option => (
                  <Button
                    isActive={option === percent}
                    key={option}
                    variant='ghost'
                    colorScheme='blue'
                    isDisabled={values.withdrawType === WithdrawType.INSTANT}
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
                          disabled={values.withdrawType === WithdrawType.INSTANT}
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
            </VStack>
          </FormControl>
        </ModalBody>
        {children && <ModalFooter as={Stack}>{children}</ModalFooter>}
        <ModalFooter as={Stack} direction='row'>
          <Button
            colorScheme={fieldError ? 'red' : 'blue'}
            isDisabled={!isValid}
            size='lg'
            isFullWidth
            type='submit'
          >
            {translate(fieldError || 'common.continue')}
          </Button>
        </ModalFooter>
      </Box>
    </SlideTransition>
  )
}
