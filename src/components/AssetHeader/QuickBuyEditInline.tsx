// QuickBuyEditInline.tsx
import { Button, FormControl, Input, Stack, useToast } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import type { QuickBuyPreferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type Props = {
  onCancel: () => void
  onSave: () => void
}

export const QuickBuyEditInline: React.FC<Props> = ({ onCancel, onSave }) => {
  const translate = useTranslate()
  const toast = useToast()
  const dispatch = useAppDispatch()
  const currentPreferences = useAppSelector(preferences.selectors.selectQuickBuyPreferences)

  const [amounts, setAmounts] = useState<string[]>(
    currentPreferences.defaultAmounts.map(amount => amount.toString()),
  )

  const handleAmountChange = useCallback(
    (index: number, value: string) => {
      const newAmounts = [...amounts]
      newAmounts[index] = value
      setAmounts(newAmounts)
    },
    [amounts],
  )

  const handleSave = useCallback(() => {
    const parsedAmounts = amounts
      .map(amount => parseFloat(amount))
      .filter(amount => !isNaN(amount) && amount > 0)

    if (parsedAmounts.length > 4) {
      toast({
        title: translate('quickBuy.edit.error.tooManyAmounts'),
        description: translate('quickBuy.edit.error.maxFourAmounts'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const newPreferences: QuickBuyPreferences = {
      ...currentPreferences,
      defaultAmounts: parsedAmounts.sort((a, b) => a - b),
    }

    dispatch(preferences.actions.setQuickBuyPreferences(newPreferences))
    onSave()
  }, [amounts, currentPreferences, dispatch, toast, translate, onSave])

  return (
    <>
      <Stack spacing={4} px={6}>
        {amounts.map((amount, index) => (
          <FormControl key={index}>
            <Input
              type='number'
              value={amount}
              // eslint-disable-next-line react-memo/require-usememo
              onChange={e => handleAmountChange(index, e.target.value)}
              min='0'
              step='0.01'
            />
          </FormControl>
        ))}
      </Stack>
      <Stack direction='row' px={6} pt={4}>
        <Button variant='ghost' onClick={onCancel} flex={1}>
          {translate('common.cancel')}
        </Button>
        <Button colorScheme='blue' onClick={handleSave} flex={1}>
          {translate('common.saveChanges')}
        </Button>
      </Stack>
    </>
  )
}
