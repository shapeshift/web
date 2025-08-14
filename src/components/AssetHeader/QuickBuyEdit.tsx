import { Button, Divider, FormControl, Input, Stack, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
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

  const inputBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const currentQuickBuyAmounts =
    stagedQuickBuyAmounts !== undefined
      ? stagedQuickBuyAmounts
      : savedQuickBuyAmounts.map(a => a.toString())

  const handleSave = useCallback(() => {
    const parsedAmounts = currentQuickBuyAmounts
      .map(parseFloat)
      .filter(amount => !isNaN(amount) && Number.isFinite(amount) && amount > 0)
      .sort((a, b) => a - b)

    if (parsedAmounts.length !== 3) {
      onCancel() // This only really happens when they enter negative numbers
      return
    }

    dispatch(preferences.actions.setQuickBuyPreferences(parsedAmounts))
    onSave()
  }, [currentQuickBuyAmounts, dispatch, onSave, onCancel])

  const handleAmountChangeAtIndex = useCallback(
    (index: number) => (values: NumberFormatValues) => {
      const newAmounts = [...currentQuickBuyAmounts]
      newAmounts[index] = values.value
      setStagedQuickBuyAmounts(newAmounts)
    },
    [currentQuickBuyAmounts],
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
