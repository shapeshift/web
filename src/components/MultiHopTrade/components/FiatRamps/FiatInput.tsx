import type { InputProps } from '@chakra-ui/react'
import { Box, Flex, Input, Skeleton, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'

import type { FiatCurrencyItem } from '@/components/Modals/FiatRamps/config'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'

type FiatInputProps = {
  selectedFiat?: FiatCurrencyItem
  amount: string
  placeholder?: string
  label: string
  onAmountChange?: (amount: string) => void
  labelPostFix?: React.ReactNode
  showPrefix?: boolean
  isReadOnly?: boolean
  quickAmounts?: string[]
  onQuickAmountClick?: (amount: string) => void
  isLoading?: boolean
}

const percentHover = {
  opacity: 0.6,
}

const focusInputStyle = {
  border: 'none',
  boxShadow: 'none',
}

const hoverInputStyle = {
  border: 'none',
}

const AmountInput = (props: InputProps) => {
  return (
    <Input
      size='lg'
      fontSize='65px'
      lineHeight='65px'
      fontWeight='bold'
      textAlign='center'
      border='none'
      borderRadius='lg'
      _focus={focusInputStyle}
      _hover={hoverInputStyle}
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
}

export const FiatInput: React.FC<FiatInputProps> = ({
  selectedFiat,
  amount,
  placeholder,
  label,
  onAmountChange,
  labelPostFix,
  showPrefix = true,
  isReadOnly = false,
  quickAmounts = ['$100', '$300', '$1,000'],
  onQuickAmountClick,
  isLoading = false,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const fiatSymbol = useMemo(() => {
    if (!showPrefix) return ''
    if (!selectedFiat) return localeParts.prefix
    return selectedFiat.symbol
  }, [selectedFiat, localeParts.prefix, showPrefix])

  const handleAmountChange = useCallback(
    (values: NumberFormatValues) => {
      if (onAmountChange) {
        const cleanValue = values.value.replace(fiatSymbol, '').replace(/,/g, '')
        onAmountChange(cleanValue)
      }
    },
    [onAmountChange, fiatSymbol],
  )

  const handleOnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onAmountChange) {
        const cleanValue = e.target.value.replace(fiatSymbol, '').replace(/,/g, '')
        onAmountChange(cleanValue)
      }
    },
    [onAmountChange, fiatSymbol],
  )

  const handleQuickAmountClick = useCallback(
    (quickAmount: string) => () => {
      const cleanAmount = quickAmount.replace(fiatSymbol, '').replace(/,/g, '')
      onQuickAmountClick?.(cleanAmount)
    },
    [onQuickAmountClick, fiatSymbol],
  )

  const formattedPlaceholder = useMemo(() => {
    return placeholder ?? `${fiatSymbol}0.00`
  }, [placeholder, fiatSymbol])

  const formattedQuickAmounts = useMemo(() => {
    return quickAmounts.map(amount => `${fiatSymbol}${amount.replace('$', '')}`)
  }, [quickAmounts, fiatSymbol])

  return (
    <Box px={6}>
      <Flex justifyContent='space-between' alignItems='center' mb={2}>
        <Text fontSize='sm' color='text.primary'>
          {label}
        </Text>
        {labelPostFix}
      </Flex>

      <Flex gap={2} alignItems='stretch'>
        <Box flex='1'>
          {isLoading ? (
            <Skeleton height='65px' width='100%' />
          ) : (
            <NumberFormat
              customInput={AmountInput}
              isNumericString={true}
              disabled={isReadOnly}
              prefix={fiatSymbol}
              suffix={localeParts.postfix}
              decimalSeparator={localeParts.decimal}
              inputMode='decimal'
              thousandSeparator={localeParts.group}
              placeholder={formattedPlaceholder}
              value={amount}
              onValueChange={handleAmountChange}
              onChange={handleOnChange}
              decimalScale={2}
            />
          )}
        </Box>
      </Flex>

      {!isReadOnly && quickAmounts.length > 0 && (
        <Flex gap={4} mt={4} justifyContent='center'>
          {formattedQuickAmounts.map(quickAmount => (
            <Box
              key={quickAmount}
              onClick={handleQuickAmountClick(quickAmount)}
              cursor='pointer'
              px={2}
              py={1}
              borderRadius='lg'
              fontSize='md'
              fontWeight='medium'
              color='text.pimary'
              bg='background.surface.raised.base'
              transition='all 0.2s'
              _hover={percentHover}
            >
              {quickAmount}
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  )
}
