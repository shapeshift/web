import { Button, Divider, FormControl, Input, Stack, useColorModeValue } from '@chakra-ui/react'
import { positiveOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type Props = {
  onCancel: () => void
  onSave: () => void
}

export const QuickBuyEdit: React.FC<Props> = ({ onCancel, onSave }) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const savedQuickBuyAmounts = useAppSelector(preferences.selectors.selectQuickBuyAmounts)
  const [stagedQuickBuyAmounts, setStagedQuickBuyAmounts] = useState<string[]>()
  const [invalidIndices, setInvalidIndices] = useState<Set<number>>(new Set())

  const inputBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const currentQuickBuyAmounts = useMemo(
    () =>
      stagedQuickBuyAmounts !== undefined
        ? stagedQuickBuyAmounts
        : savedQuickBuyAmounts.map(a => a.toString()),
    [savedQuickBuyAmounts, stagedQuickBuyAmounts],
  )

  const handleSave = useCallback(() => {
    const newInvalidIndices = new Set<number>()
    const parsedAmounts = currentQuickBuyAmounts.map((amount, index) => {
      const parsed = positiveOrZero(amount)
      const num = parsed.toNumber()
      if (num === 0 || isNaN(num)) {
        newInvalidIndices.add(index)
      }
      return parsed
    })

    if (newInvalidIndices.size > 0) {
      setInvalidIndices(newInvalidIndices)
      return
    }

    const sortedAmounts = parsedAmounts
      .sort((a, b) => a.comparedTo(b) ?? 0)
      .map(num => num.toNumber())

    dispatch(preferences.actions.setQuickBuyPreferences(sortedAmounts))
    onSave()
  }, [currentQuickBuyAmounts, dispatch, onSave])

  const handleAmountChangeAtIndex = useCallback(
    (index: number) => (values: NumberFormatValues) => {
      const newAmounts = [...currentQuickBuyAmounts]
      newAmounts[index] = values.value
      setStagedQuickBuyAmounts(newAmounts)

      // Clear invalid state when user types
      if (invalidIndices.has(index)) {
        const newInvalidIndices = new Set(invalidIndices)
        newInvalidIndices.delete(index)
        setInvalidIndices(newInvalidIndices)
      }
    },
    [currentQuickBuyAmounts, invalidIndices],
  )

  return (
    <>
      <Stack spacing={4} px={6}>
        {currentQuickBuyAmounts.map((amount, index) => (
          <FormControl key={index}>
            <NumberFormat
              height={12}
              inputMode='decimal'
              thousandSeparator={localeParts.group}
              decimalSeparator={localeParts.decimal}
              textAlign='center'
              fontWeight='semibold'
              fontSize='lg'
              rounded='full'
              background={inputBg}
              prefix={localeParts.prefix}
              suffix={localeParts.postfix}
              value={amount}
              onValueChange={handleAmountChangeAtIndex(index)}
              decimalScale={2}
              fixedDecimalScale
              customInput={Input}
              borderColor={invalidIndices.has(index) ? 'red.500' : undefined}
            />
          </FormControl>
        ))}
      </Stack>
      <Divider my={6} />
      <Stack spacing={4} px={6}>
        <Button colorScheme='blue' size='lg' rounded='full' onClick={handleSave}>
          {translate('common.saveChanges')}
        </Button>
        <Button size='lg' rounded='full' onClick={onCancel}>
          {translate('common.cancel')}
        </Button>
      </Stack>
    </>
  )
}
