import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Flex } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo } from 'react'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Text } from '@/components/Text'
import { useQuoteSortOptions } from '@/state/slices/tradeQuoteSlice/hooks'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppSelector } from '@/state/store'

export const QuoteSortSelector: FC = memo(() => {
  const currentSortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)

  const quoteSortOptions = useQuoteSortOptions()

  return (
    <>
      <Text translation='trade.sort.sortBy' />
      <Text translation='trade.sort.info' fontWeight='medium' fontSize='xs' color='text.subtle' />
      <ButtonGroup
        mt={6}
        size='sm'
        borderRadius='xl'
        variant='ghost'
        isAttached
        orientation='vertical'
        width='full'
      >
        {quoteSortOptions.map(buttonConf => (
          <Button
            key={buttonConf.value}
            color='white'
            fontWeight='medium'
            h={10}
            px={4}
            border='1px solid'
            borderColor='whiteAlpha.50'
            isActive={currentSortOption === buttonConf.value}
            onClick={buttonConf.handleClick}
          >
            <Flex width='full' justify='space-between'>
              <HelperTooltip label={buttonConf.tooltip}>{buttonConf.label}</HelperTooltip>
              {currentSortOption === buttonConf.value && <CheckCircleIcon color='blue.200' />}
            </Flex>
          </Button>
        ))}
      </ButtonGroup>
    </>
  )
})
