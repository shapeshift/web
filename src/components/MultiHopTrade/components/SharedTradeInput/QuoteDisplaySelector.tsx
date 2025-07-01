import { Box, Button, ButtonGroup } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Text } from '@/components/Text'
import { preferences, QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const QuoteDisplaySelector: FC = memo(() => {
  const quoteDisplayOption = useAppSelector(preferences.selectors.selectQuoteDisplayOption)

  const translate = useTranslate()

  const dispatch = useAppDispatch()

  const handleBasicDisplaySelect = useCallback((): void => {
    dispatch(preferences.actions.setQuoteDisplayOption(QuoteDisplayOption.Basic))
  }, [dispatch])

  const handleAdvancedDisplaySelect = useCallback((): void => {
    dispatch(preferences.actions.setQuoteDisplayOption(QuoteDisplayOption.Advanced))
  }, [dispatch])

  return (
    <Box>
      <Text translation='trade.quoteDisplay.title' />
      <Text
        translation='trade.quoteDisplay.info'
        fontWeight='medium'
        fontSize='xs'
        color='text.subtle'
      />
      <ButtonGroup
        size='sm'
        bg='background.input.base'
        mt={4}
        p={1}
        borderRadius='xl'
        variant='ghost'
      >
        <Button
          isActive={quoteDisplayOption === QuoteDisplayOption.Basic}
          onClick={handleBasicDisplaySelect}
        >
          {translate('trade.quoteDisplay.basic')}
        </Button>
        <Button
          isActive={quoteDisplayOption === QuoteDisplayOption.Advanced}
          onClick={handleAdvancedDisplaySelect}
        >
          {translate('trade.quoteDisplay.advanced')}
        </Button>
      </ButtonGroup>
    </Box>
  )
})
