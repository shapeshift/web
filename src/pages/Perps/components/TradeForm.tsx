import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Tab,
  TabList,
  Tabs,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { ChangeEvent, FormEvent } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedMarket, OrderSide, OrderType } from '@/lib/hyperliquid/types'
import { formatLeverage, formatPrice } from '@/lib/hyperliquid/utils'
import { PerpsOrderSubmissionState, perpsSlice } from '@/state/slices/perpsSlice/perpsSlice'
import {
  selectAvailableMargin,
  selectIsOrderSubmitting,
  selectIsValidOrderForm,
  selectOrderbookMidPrice,
  selectOrderFormLeverage,
  selectOrderFormPostOnly,
  selectOrderFormPrice,
  selectOrderFormReduceOnly,
  selectOrderFormSide,
  selectOrderFormSize,
  selectOrderFormType,
  selectOrderSubmission,
  selectSelectedMarketPosition,
} from '@/state/slices/perpsSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type TradeFormProps = {
  selectedMarket: AugmentedMarket | undefined
  isLoading: boolean
  isWalletConnected: boolean
  onSubmitOrder: () => Promise<void>
}

type OrderTypeButtonProps = {
  type: OrderType
  isActive: boolean
  onClick: () => void
}

const OrderTypeButton = memo(({ type, isActive, onClick }: OrderTypeButtonProps) => {
  const activeBg = useColorModeValue('gray.100', 'whiteAlpha.200')

  return (
    <Button
      size='sm'
      variant={isActive ? 'solid' : 'ghost'}
      bg={isActive ? activeBg : undefined}
      onClick={onClick}
      fontWeight={isActive ? 'semibold' : 'normal'}
      flex={1}
    >
      {type}
    </Button>
  )
})

type LeverageSliderProps = {
  value: number
  maxLeverage: number
  onChange: (value: number) => void
}

const leverageMarks = [1, 5, 10, 25, 50]

const LeverageSlider = memo(({ value, maxLeverage, onChange }: LeverageSliderProps) => {
  const translate = useTranslate()
  const thumbBg = useColorModeValue('blue.500', 'blue.300')
  const trackBg = useColorModeValue('gray.200', 'whiteAlpha.200')
  const filledTrackBg = useColorModeValue('blue.500', 'blue.300')

  const handleChange = useCallback(
    (val: number) => {
      onChange(Math.min(val, maxLeverage))
    },
    [maxLeverage, onChange],
  )

  const availableMarks = useMemo(() => {
    return leverageMarks.filter(mark => mark <= maxLeverage)
  }, [maxLeverage])

  return (
    <Box width='full'>
      <Flex justify='space-between' mb={2}>
        <Text fontSize='sm' fontWeight='medium'>
          {translate('perps.tradeForm.leverage')}
        </Text>
        <Text fontSize='sm' fontWeight='bold' color='blue.500'>
          {formatLeverage(value)}
        </Text>
      </Flex>
      <Slider
        value={value}
        min={1}
        max={maxLeverage}
        step={1}
        onChange={handleChange}
        focusThumbOnChange={false}
      >
        <SliderTrack bg={trackBg}>
          <SliderFilledTrack bg={filledTrackBg} />
        </SliderTrack>
        <SliderThumb boxSize={4} bg={thumbBg} />
      </Slider>
      <HStack justify='space-between' mt={1}>
        {availableMarks.map(mark => (
          <Button
            key={mark}
            size='xs'
            variant='ghost'
            onClick={() => handleChange(mark)}
            color={value === mark ? 'blue.500' : 'text.subtle'}
            fontWeight={value === mark ? 'bold' : 'normal'}
            minW='auto'
            px={1}
          >
            {mark}x
          </Button>
        ))}
      </HStack>
    </Box>
  )
})

type OrderSummaryProps = {
  side: OrderSide
  size: string
  price: string
  leverage: number
  market: AugmentedMarket | undefined
}

const OrderSummary = memo(({ side, size, price, leverage, market }: OrderSummaryProps) => {
  const translate = useTranslate()
  const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50')

  const orderValue = useMemo(() => {
    if (!size || !price) return '0'
    return bnOrZero(size).times(price).toString()
  }, [size, price])

  const marginRequired = useMemo(() => {
    if (!orderValue || leverage === 0) return '0'
    return bnOrZero(orderValue).div(leverage).toString()
  }, [orderValue, leverage])

  const sideLabel =
    side === 'B' ? translate('perps.tradeForm.long') : translate('perps.tradeForm.short')
  const sideColor = side === 'B' ? 'green.500' : 'red.500'

  if (!market || !bnOrZero(size).gt(0)) return null

  return (
    <Box bg={bgColor} borderRadius='lg' p={3} width='full'>
      <VStack spacing={2} align='stretch'>
        <HStack justify='space-between'>
          <Text fontSize='xs' color='text.subtle'>
            {translate('perps.tradeForm.direction')}
          </Text>
          <Text fontSize='xs' fontWeight='semibold' color={sideColor}>
            {sideLabel}
          </Text>
        </HStack>
        <HStack justify='space-between'>
          <Text fontSize='xs' color='text.subtle'>
            {translate('perps.tradeForm.orderValue')}
          </Text>
          <Amount.Fiat value={orderValue} fontSize='xs' fontWeight='medium' />
        </HStack>
        <HStack justify='space-between'>
          <Text fontSize='xs' color='text.subtle'>
            {translate('perps.tradeForm.marginRequired')}
          </Text>
          <Amount.Fiat value={marginRequired} fontSize='xs' fontWeight='medium' />
        </HStack>
        <HStack justify='space-between'>
          <Text fontSize='xs' color='text.subtle'>
            {translate('perps.tradeForm.leverage')}
          </Text>
          <Text fontSize='xs' fontWeight='medium'>
            {formatLeverage(leverage)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  )
})

export const TradeForm = memo(
  ({ selectedMarket, isLoading, isWalletConnected, onSubmitOrder }: TradeFormProps) => {
    const translate = useTranslate()
    const dispatch = useAppDispatch()
    const { dispatch: walletDispatch } = useWallet()

    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const bgColor = useColorModeValue('white', 'gray.800')
    const buyBgColor = useColorModeValue('green.50', 'green.900')
    const sellBgColor = useColorModeValue('red.50', 'red.900')
    const buyColor = useColorModeValue('green.600', 'green.300')
    const sellColor = useColorModeValue('red.600', 'red.300')
    const inputBgColor = useColorModeValue('white', 'gray.900')

    const [isSizeInUsd, setIsSizeInUsd] = useState(false)

    const orderFormSide = useAppSelector(selectOrderFormSide)
    const orderFormType = useAppSelector(selectOrderFormType)
    const orderFormPrice = useAppSelector(selectOrderFormPrice)
    const orderFormSize = useAppSelector(selectOrderFormSize)
    const orderFormLeverage = useAppSelector(selectOrderFormLeverage)
    const orderFormReduceOnly = useAppSelector(selectOrderFormReduceOnly)
    const orderFormPostOnly = useAppSelector(selectOrderFormPostOnly)
    const orderSubmission = useAppSelector(selectOrderSubmission)
    const isOrderSubmitting = useAppSelector(selectIsOrderSubmitting)
    const isValidOrderForm = useAppSelector(selectIsValidOrderForm)
    const availableMargin = useAppSelector(selectAvailableMargin)
    const midPrice = useAppSelector(selectOrderbookMidPrice)
    const currentPosition = useAppSelector(selectSelectedMarketPosition)

    const isBuy = orderFormSide === 'B'
    const isMarketOrder = orderFormType === 'Market'
    const maxLeverage = selectedMarket?.maxLeverage ?? 50

    const effectivePrice = useMemo(() => {
      if (isMarketOrder) {
        return midPrice ?? selectedMarket?.markPx ?? '0'
      }
      return orderFormPrice
    }, [isMarketOrder, midPrice, selectedMarket?.markPx, orderFormPrice])

    const handleSideChange = useCallback(
      (index: number) => {
        const newSide: OrderSide = index === 0 ? 'B' : 'A'
        dispatch(perpsSlice.actions.setOrderFormSide(newSide))
      },
      [dispatch],
    )

    const handleOrderTypeChange = useCallback(
      (type: OrderType) => {
        dispatch(perpsSlice.actions.setOrderFormType(type))
        if (type === 'Market') {
          dispatch(perpsSlice.actions.setOrderFormPostOnly(false))
        }
      },
      [dispatch],
    )

    const handlePriceChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9.]/g, '')
        dispatch(perpsSlice.actions.setOrderFormPrice(value))
      },
      [dispatch],
    )

    const handleSizeChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9.]/g, '')
        dispatch(perpsSlice.actions.setOrderFormSize(value))
      },
      [dispatch],
    )

    const handleLeverageChange = useCallback(
      (value: number) => {
        dispatch(perpsSlice.actions.setOrderFormLeverage(value))
      },
      [dispatch],
    )

    const handleReduceOnlyChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        dispatch(perpsSlice.actions.setOrderFormReduceOnly(e.target.checked))
      },
      [dispatch],
    )

    const handlePostOnlyChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        dispatch(perpsSlice.actions.setOrderFormPostOnly(e.target.checked))
      },
      [dispatch],
    )

    const handleConnect = useCallback(() => {
      walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    }, [walletDispatch])

    const handleSubmit = useCallback(
      async (e: FormEvent) => {
        e.preventDefault()
        if (!isWalletConnected) {
          handleConnect()
          return
        }
        await onSubmitOrder()
      },
      [isWalletConnected, handleConnect, onSubmitOrder],
    )

    const handleSetMarketPrice = useCallback(() => {
      if (midPrice) {
        dispatch(perpsSlice.actions.setOrderFormPrice(formatPrice(midPrice, 2)))
      }
    }, [dispatch, midPrice])

    const toggleSizeUnit = useCallback(() => {
      setIsSizeInUsd(prev => !prev)
    }, [])

    const sizeUsdValue = useMemo(() => {
      if (!orderFormSize || !effectivePrice) return '0'
      return bnOrZero(orderFormSize).times(effectivePrice).toString()
    }, [orderFormSize, effectivePrice])

    const submitButtonText = useMemo(() => {
      if (!isWalletConnected) {
        return translate('common.connectWallet')
      }
      if (isOrderSubmitting) {
        return orderSubmission.state === PerpsOrderSubmissionState.Signing
          ? translate('perps.tradeForm.signing')
          : translate('perps.tradeForm.submitting')
      }
      if (!selectedMarket) {
        return translate('perps.tradeForm.selectMarket')
      }
      if (!isValidOrderForm) {
        return translate('perps.tradeForm.enterAmount')
      }
      const sideLabel = isBuy ? translate('perps.tradeForm.buy') : translate('perps.tradeForm.sell')
      return `${sideLabel} ${selectedMarket.coin}`
    }, [
      isWalletConnected,
      isOrderSubmitting,
      orderSubmission.state,
      selectedMarket,
      isValidOrderForm,
      isBuy,
      translate,
    ])

    const isSubmitDisabled = useMemo(() => {
      if (!isWalletConnected) return false
      if (isOrderSubmitting) return true
      if (!selectedMarket) return true
      if (!isValidOrderForm) return true
      return false
    }, [isWalletConnected, isOrderSubmitting, selectedMarket, isValidOrderForm])

    const submitButtonBg = isBuy ? 'green.500' : 'red.500'
    const submitButtonHoverBg = isBuy ? 'green.600' : 'red.600'

    if (isLoading) {
      return (
        <Box borderRadius='lg' border='1px solid' borderColor={borderColor} bg={bgColor} p={4}>
          <VStack spacing={4} align='stretch'>
            <Skeleton height='40px' />
            <Skeleton height='60px' />
            <Skeleton height='60px' />
            <Skeleton height='40px' />
            <Skeleton height='48px' />
          </VStack>
        </Box>
      )
    }

    return (
      <Box
        as='form'
        onSubmit={handleSubmit}
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        bg={bgColor}
        overflow='hidden'
      >
        <Tabs index={isBuy ? 0 : 1} onChange={handleSideChange} variant='unstyled' isFitted>
          <TabList borderBottomWidth={1} borderColor={borderColor}>
            <Tab
              py={3}
              fontWeight='bold'
              color={isBuy ? buyColor : 'text.subtle'}
              bg={isBuy ? buyBgColor : 'transparent'}
              _selected={{ color: buyColor, bg: buyBgColor }}
              borderBottomWidth={2}
              borderBottomColor={isBuy ? 'green.500' : 'transparent'}
            >
              {translate('perps.tradeForm.long')}
            </Tab>
            <Tab
              py={3}
              fontWeight='bold'
              color={!isBuy ? sellColor : 'text.subtle'}
              bg={!isBuy ? sellBgColor : 'transparent'}
              _selected={{ color: sellColor, bg: sellBgColor }}
              borderBottomWidth={2}
              borderBottomColor={!isBuy ? 'red.500' : 'transparent'}
            >
              {translate('perps.tradeForm.short')}
            </Tab>
          </TabList>
        </Tabs>

        <VStack spacing={4} p={4} align='stretch'>
          <ButtonGroup size='sm' isAttached width='full'>
            <OrderTypeButton
              type='Limit'
              isActive={orderFormType === 'Limit'}
              onClick={() => handleOrderTypeChange('Limit' as OrderType)}
            />
            <OrderTypeButton
              type='Market'
              isActive={orderFormType === 'Market'}
              onClick={() => handleOrderTypeChange('Market' as OrderType)}
            />
          </ButtonGroup>

          {!isMarketOrder && (
            <FormControl>
              <Flex justify='space-between' align='center' mb={1}>
                <FormLabel mb={0} fontSize='sm'>
                  {translate('perps.tradeForm.price')}
                </FormLabel>
                {midPrice && (
                  <Button size='xs' variant='link' color='blue.500' onClick={handleSetMarketPrice}>
                    {translate('perps.tradeForm.useMarket')}
                  </Button>
                )}
              </Flex>
              <InputGroup>
                <Input
                  type='text'
                  inputMode='decimal'
                  value={orderFormPrice}
                  onChange={handlePriceChange}
                  placeholder='0.00'
                  bg={inputBgColor}
                  fontFamily='mono'
                />
                <InputRightElement>
                  <Text fontSize='sm' color='text.subtle' pr={2}>
                    USD
                  </Text>
                </InputRightElement>
              </InputGroup>
            </FormControl>
          )}

          <FormControl>
            <Flex justify='space-between' align='center' mb={1}>
              <FormLabel mb={0} fontSize='sm'>
                {translate('perps.tradeForm.size')}
              </FormLabel>
              <Button size='xs' variant='link' color='text.subtle' onClick={toggleSizeUnit}>
                {isSizeInUsd ? 'USD' : selectedMarket?.coin ?? 'COIN'}
              </Button>
            </Flex>
            <InputGroup>
              <Input
                type='text'
                inputMode='decimal'
                value={orderFormSize}
                onChange={handleSizeChange}
                placeholder='0.00'
                bg={inputBgColor}
                fontFamily='mono'
              />
              <InputRightElement>
                <Text fontSize='sm' color='text.subtle' pr={2}>
                  {selectedMarket?.coin ?? ''}
                </Text>
              </InputRightElement>
            </InputGroup>
            {bnOrZero(orderFormSize).gt(0) && effectivePrice && (
              <Text fontSize='xs' color='text.subtle' mt={1}>
                {translate('perps.tradeForm.estimatedValue')}:{' '}
                <Amount.Fiat value={sizeUsdValue} fontSize='xs' />
              </Text>
            )}
          </FormControl>

          <LeverageSlider
            value={orderFormLeverage}
            maxLeverage={maxLeverage}
            onChange={handleLeverageChange}
          />

          <HStack spacing={4}>
            <Checkbox isChecked={orderFormReduceOnly} onChange={handleReduceOnlyChange} size='sm'>
              <Text fontSize='sm'>{translate('perps.tradeForm.reduceOnly')}</Text>
            </Checkbox>
            {!isMarketOrder && (
              <Checkbox isChecked={orderFormPostOnly} onChange={handlePostOnlyChange} size='sm'>
                <Text fontSize='sm'>{translate('perps.tradeForm.postOnly')}</Text>
              </Checkbox>
            )}
          </HStack>

          {availableMargin && (
            <HStack justify='space-between'>
              <Text fontSize='xs' color='text.subtle'>
                {translate('perps.tradeForm.availableMargin')}
              </Text>
              <Amount.Fiat value={availableMargin} fontSize='xs' fontWeight='medium' />
            </HStack>
          )}

          {currentPosition && (
            <HStack justify='space-between'>
              <Text fontSize='xs' color='text.subtle'>
                {translate('perps.tradeForm.currentPosition')}
              </Text>
              <Text
                fontSize='xs'
                fontWeight='medium'
                color={currentPosition.side === 'long' ? 'green.500' : 'red.500'}
              >
                {currentPosition.side === 'long' ? '+' : '-'}
                {currentPosition.size} {selectedMarket?.coin}
              </Text>
            </HStack>
          )}

          <OrderSummary
            side={orderFormSide}
            size={orderFormSize}
            price={effectivePrice}
            leverage={orderFormLeverage}
            market={selectedMarket}
          />

          {orderSubmission.error && (
            <Text fontSize='sm' color='red.500' textAlign='center'>
              {orderSubmission.error}
            </Text>
          )}

          <Button
            type='submit'
            size='lg'
            width='full'
            bg={isWalletConnected ? submitButtonBg : 'blue.500'}
            color='white'
            _hover={{ bg: isWalletConnected ? submitButtonHoverBg : 'blue.600' }}
            isDisabled={isSubmitDisabled}
            leftIcon={isOrderSubmitting ? <Spinner size='sm' /> : undefined}
          >
            {submitButtonText}
          </Button>
        </VStack>
      </Box>
    )
  },
)
