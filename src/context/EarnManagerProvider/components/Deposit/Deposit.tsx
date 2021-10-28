import { Button, ButtonGroup, IconButton } from '@chakra-ui/button'
import {
  Box,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
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
import { Asset } from '@shapeshiftoss/types'
import { useState } from 'react'
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

type PercentAmounts = 25 | 50 | 75 | 100

type DepositProps = {
  asset: Asset
  // Estimated apy (Deposit Only)
  apy?: string // mocks dont show this anymore
  // Estimated fiat yield amount (Deposit Only)
  estimatedFiatYield: string
  // Estimated crypto yield amount (Deposit Only)
  estimatedCryptoYield: string
  // Users amount to Deposit or remove
  fiatAmount: string
  // Users available amount
  fiatAmountAvailable: string
  // Fiat Deposit and Gas Fees Total
  fiatTotalPlusFees: string
  // Users amount to Deposit or remove
  cryptoAmount: string
  // Users available amount
  cryptoAmountAvailable: string
  // Current Slippage
  slippage: number | string
  // Array of the % options
  maxOptions: string[]
  onContinue(): void
  onCancel(): void
  onSlippageChange(slippage: number | string): void
  onPercentClick(percent: PercentAmounts): void
  onCurrencyToggle(): void
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

export const Deposit = ({
  onContinue,
  onCancel,
  slippage,
  maxOptions,
  onSlippageChange,
  onCurrencyToggle
}: DepositProps) => {
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const translate = useTranslate()
  const [cryptoValue, setCryptoValue] = useState('')

  return (
    <SlideTransition>
      <Box maxWidth='lg' width='full'>
        <ModalBody>
          <Card size='sm' width='full' variant='group' my={6}>
            <Card.Body>
              <Flex alignItems='center'>
                <AssetIcon symbol='usdc' boxSize='40px' />
                <Box ml={2}>
                  <RawText fontWeight='bold' lineHeight='1' mb={1}>
                    USD Coin
                  </RawText>
                  <RawText color='gray.500' lineHeight='1'>
                    USDC
                  </RawText>
                </Box>
                <Box ml='auto' textAlign='right'>
                  <RawText fontWeight='bold' lineHeight='1' mb={1}>
                    $17,250.00
                  </RawText>
                  <RawText color='gray.500' lineHeight='1'>
                    17,250 USDC
                  </RawText>
                </Box>
              </Flex>
            </Card.Body>
          </Card>
          <FormControl mb={6}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <FormLabel color='gray.500'>{translate('modals.deposit.amountToDeposit')}</FormLabel>
              <FormHelperText
                mt={0}
                mr={3}
                mb={2}
                as='button'
                type='button'
                color='gray.500'
                onClick={onCurrencyToggle}
                textTransform='uppercase'
                _hover={{ color: 'gray.400', transition: '.2s color ease' }}
              >
                <Amount.Crypto value='1000' symbol={'USDC'} />
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
                    onClick={onCurrencyToggle}
                    width='full'
                  >
                    USDC
                  </Button>
                </InputLeftElement>
                <NumberFormat
                  inputMode='decimal'
                  thousandSeparator={localeParts.group}
                  decimalSeparator={localeParts.decimal}
                  customInput={CryptoInput}
                  value={cryptoValue}
                  onValueChange={e => {
                    setCryptoValue(e.value)
                  }}
                />
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
                        <RawText fontSize='sm'>Slippage Settings</RawText>
                      </PopoverHeader>
                      <PopoverBody>
                        <Slippage onSlippageChange={onSlippageChange} value={slippage} />
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </InputRightElement>
              </InputGroup>
              <ButtonGroup width='full' justifyContent='space-between' size='sm' px={4} py={2}>
                {maxOptions.map(option => (
                  <Button variant='ghost' colorScheme='blue'>
                    {option}
                  </Button>
                ))}
              </ButtonGroup>
              <Row px={4} py={4}>
                <Row.Label>{translate('modals.deposit.estimatedReturns')}</Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <RawText fontWeight='bold' lineHeight='1' mb={1}>
                      $0.00
                    </RawText>
                    <RawText color='gray.500' lineHeight='1'>
                      0.0 USDC
                    </RawText>
                  </Box>
                </Row.Value>
              </Row>
              <FormHelperText pb={2}>
                {translate('modals.deposit.estimateDisclaimer')}
              </FormHelperText>
            </VStack>
          </FormControl>
        </ModalBody>
        <ModalFooter flexDir='column' borderTopWidth={1} borderColor='gray.750'>
          <Text
            fontSize='sm'
            color='gray.500'
            mb={2}
            width='full'
            textAlign='center'
            translation='modals.deposit.footerDisclaimer'
          />
          <Button onClick={onContinue} size='lg' colorScheme='blue' mb={2} width='full'>
            {translate('common.continue')}
          </Button>
          <Button onClick={onCancel} size='lg' variant='ghost' width='full'>
            {translate('common.cancel')}
          </Button>
        </ModalFooter>
      </Box>
    </SlideTransition>
  )
}
