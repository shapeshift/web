import type { InputProps } from '@chakra-ui/react'
import { Box, Flex, Input, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import NumberFormat from 'react-number-format'

import type { FiatTypeEnumWithoutCryptos } from '@/constants/fiats'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'

type FiatInputProps = {
  selectedFiat?: FiatTypeEnumWithoutCryptos
  amount: string
  placeholder?: string
  label: string
  onAmountChange?: (amount: string) => void
  labelPostFix?: React.ReactNode
  isReadOnly?: boolean
  quickAmounts?: string[]
  onQuickAmountClick?: (amount: string) => void
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
  isReadOnly = false,
  quickAmounts = ['$100', '$300', '$1,000'],
  onQuickAmountClick,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onAmountChange) {
        onAmountChange(e.target.value)
      }
    },
    [onAmountChange],
  )

  const handleQuickAmountClick = useCallback(
    (quickAmount: string) => () => {
      onQuickAmountClick?.(quickAmount.replace('$', '').replace(',', ''))
    },
    [onQuickAmountClick],
  )

  const formattedPlaceholder = useMemo(() => {
    return placeholder ?? `${localeParts.prefix}0.00${localeParts.postfix}`
  }, [placeholder, localeParts.prefix, localeParts.postfix])

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
          <NumberFormat
            customInput={AmountInput}
            isNumericString={true}
            disabled={isReadOnly}
            suffix={localeParts.postfix}
            prefix={localeParts.prefix}
            decimalSeparator={localeParts.decimal}
            inputMode='decimal'
            thousandSeparator={localeParts.group}
            placeholder={formattedPlaceholder}
            value={amount}
            onChange={handleAmountChange}
          />
        </Box>
      </Flex>

      {!isReadOnly && quickAmounts.length > 0 && (
        <Flex gap={4} mt={4} justifyContent='center'>
          {quickAmounts.map(quickAmount => (
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

      {selectedFiat && selectedFiat !== 'USD' && amount && (
        <Text fontSize='xs' color='text.subtle' mt={2} textAlign='right'>
          ≈ ${amount} USD
        </Text>
      )}
    </Box>
  )
}
