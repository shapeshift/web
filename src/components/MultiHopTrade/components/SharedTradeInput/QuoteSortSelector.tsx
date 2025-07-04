import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Flex, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo } from 'react'

import { Text } from '@/components/Text'
import { useQuoteSortOptions } from '@/state/slices/tradeQuoteSlice/hooks'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppSelector } from '@/state/store'

export const QuoteSortSelector: FC = memo(() => {
  const currentSortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)

  const quoteSortOptions = useQuoteSortOptions()

  const buttonBorderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const buttonTextColor = useColorModeValue('black', 'white')

  return (
    <>
      <Text translation='trade.sort.sortBy' />
      <Text translation='trade.sort.info' fontWeight='medium' fontSize='xs' color='text.subtle' />
      <ButtonGroup
        mt={4}
        size='sm'
        borderRadius='xl'
        variant='ghost'
        isAttached
        orientation='vertical'
        width='full'
      >
        {quoteSortOptions.map(quoteSortOpt => (
          <Button
            key={quoteSortOpt.value}
            color={buttonTextColor}
            fontWeight='medium'
            h={10}
            px={4}
            border='1px solid'
            borderColor={buttonBorderColor}
            isActive={currentSortOption === quoteSortOpt.value}
            onClick={quoteSortOpt.handleClick}
          >
            <Flex width='full' justify='space-between' alignItems='center'>
              {quoteSortOpt.label}
              {currentSortOption === quoteSortOpt.value && <CheckCircleIcon color='blue.200' />}
            </Flex>
          </Button>
        ))}
      </ButtonGroup>
    </>
  )
})
