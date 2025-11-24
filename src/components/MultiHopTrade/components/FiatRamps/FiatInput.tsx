import type { InputProps } from '@chakra-ui/react'
import { Box, Flex, Input, Skeleton, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat, numericFormatter } from 'react-number-format'

import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'

type FiatInputProps = {
  selectedFiatCurrency: FiatCurrencyItem
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

// Thresholds for progressive font size reduction based on amount length
const FONT_SIZE_THRESHOLDS = {
  SMALL: 10,
  MEDIUM: 14,
  LARGE: 18,
} as const

const getFontSizeByLength = (length: number): string => {
  if (length >= FONT_SIZE_THRESHOLDS.LARGE) return '24px'
  if (length >= FONT_SIZE_THRESHOLDS.MEDIUM) return '30px'
  if (length >= FONT_SIZE_THRESHOLDS.SMALL) return '38px'
  return '65px'
}

const AmountInput = (props: InputProps & { formattedValueLength?: number }) => {
  const { formattedValueLength, ...rest } = props
  const fontSize = useMemo(
    () => getFontSizeByLength(formattedValueLength ?? 0),
    [formattedValueLength],
  )

  const lineHeight = useMemo(() => fontSize, [fontSize])

  const combinedStyle = useMemo(
    () => ({
      fontSize,
      lineHeight,
    }),
    [fontSize, lineHeight],
  )

  return (
    <Input
      size='lg'
      fontWeight='bold'
      textAlign='center'
      border='none'
      borderRadius='lg'
      _focus={focusInputStyle}
      _hover={hoverInputStyle}
      bg='transparent'
      variant='unstyled'
      color={rest.value ? 'text.base' : 'text.subtle'}
      style={combinedStyle}
      {...rest}
    />
  )
}

export const FiatInput: React.FC<FiatInputProps> = ({
  selectedFiatCurrency,
  amount,
  placeholder,
  label,
  onAmountChange,
  labelPostFix,
  showPrefix = true,
  isReadOnly = false,
  quickAmounts = ['100', '300', '1000'],
  onQuickAmountClick,
  isLoading = false,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const fiatSymbol = useMemo(() => {
    if (!showPrefix) return ''
    return selectedFiatCurrency.symbol
  }, [selectedFiatCurrency, showPrefix])

  const formattedValueLength = useMemo(() => {
    if (!amount) return 0

    const formatted = numericFormatter(amount, {
      prefix: fiatSymbol,
      decimalSeparator: localeParts.decimal,
      thousandSeparator: localeParts.group,
      decimalScale: selectedFiatCurrency.decimal_digits,
    })

    return formatted.length
  }, [
    amount,
    selectedFiatCurrency.decimal_digits,
    fiatSymbol,
    localeParts.decimal,
    localeParts.group,
  ])

  const handleAmountChange = useCallback(
    (values: NumberFormatValues) => {
      if (onAmountChange) {
        onAmountChange(values.value)
      }
    },
    [onAmountChange],
  )

  const handleQuickAmountClick = useCallback(
    (quickAmount: string) => () => {
      onQuickAmountClick?.(quickAmount)
    },
    [onQuickAmountClick],
  )

  const formattedPlaceholder = useMemo(() => {
    return placeholder ?? `${fiatSymbol}0.00`
  }, [placeholder, fiatSymbol])

  const formattedQuickAmounts = useMemo(() => {
    return quickAmounts.map(amount => ({
      formattedAmount: `${fiatSymbol}${amount}`,
      value: amount,
    }))
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
            <NumericFormat
              customInput={AmountInput}
              valueIsNumericString={true}
              readOnly={isReadOnly}
              prefix={fiatSymbol}
              decimalSeparator={localeParts.decimal}
              inputMode='decimal'
              thousandSeparator={localeParts.group}
              decimalScale={2}
              fixedDecimalScale={false}
              placeholder={formattedPlaceholder}
              allowNegative={false}
              value={amount || undefined}
              formattedValueLength={formattedValueLength}
              onValueChange={handleAmountChange}
            />
          )}
        </Box>
      </Flex>

      {!isReadOnly && quickAmounts.length > 0 && (
        <Flex gap={4} mt={4} justifyContent='center'>
          {formattedQuickAmounts.map(quickAmount => (
            <Box
              key={quickAmount.value}
              onClick={handleQuickAmountClick(quickAmount.value)}
              cursor='pointer'
              px={2}
              py={1}
              borderRadius='lg'
              fontSize='md'
              fontWeight='medium'
              bg='background.surface.raised.base'
              transition='all 0.2s'
              _hover={percentHover}
            >
              {quickAmount.formattedAmount}
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  )
}
