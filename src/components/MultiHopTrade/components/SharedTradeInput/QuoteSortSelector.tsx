import { Box, Flex, FormControl, InputGroup, Radio, RadioGroup, Stack } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { QuoteSortOption } from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

enum SortType {
  BestRate = 'BestRate',
  LowestGas = 'LowestGas',
  Fastest = 'Fastest',
}

export const QuoteSortSelector: FC = memo(() => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const currentSortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)

  const currentSortType = useMemo(() => {
    switch (currentSortOption) {
      case QuoteSortOption.LOWEST_GAS:
        return SortType.LowestGas
      case QuoteSortOption.FASTEST:
        return SortType.Fastest
      case QuoteSortOption.BEST_RATE:
      default:
        return SortType.BestRate
    }
  }, [currentSortOption])

  const handleSortTypeChange = useCallback(
    (sortType: SortType) => {
      const sortOption: QuoteSortOption = (() => {
        switch (sortType) {
          case SortType.LowestGas:
            return QuoteSortOption.LOWEST_GAS
          case SortType.Fastest:
            return QuoteSortOption.FASTEST
          case SortType.BestRate:
          default:
            return QuoteSortOption.BEST_RATE
        }
      })()
      dispatch(tradeQuoteSlice.actions.setSortOption(sortOption))
    },
    [dispatch],
  )

  return (
    <>
      <Row>
        <Row.Label>
          <HelperTooltip label={translate('trade.sort.info')}>
            <Text translation='trade.sort.sortBy' />
          </HelperTooltip>
        </Row.Label>
      </Row>
      <Row py={2} gap={2} mt={2}>
        <FormControl>
          <InputGroup variant='filled' width='full'>
            <RadioGroup value={currentSortType} onChange={handleSortTypeChange} width='100%'>
              <Stack
                bg='transparent'
                px={1}
                py={1}
                borderRadius='xl'
                borderColor='border.base'
                borderWidth={1}
                width='100%'
                direction='column'
                spacing={2}
              >
                <Flex
                  as='label'
                  align='center'
                  justify='space-between'
                  width='100%'
                  px={2}
                  py={2}
                  borderRadius='lg'
                  cursor='pointer'
                  htmlFor='sort-best-rate'
                  bg={currentSortType === SortType.BestRate ? 'gray.700' : 'transparent'}
                >
                  <Box fontSize='sm'>{translate('trade.sort.bestRate')}</Box>
                  <Radio
                    id='sort-best-rate'
                    value={SortType.BestRate}
                    isChecked={currentSortType === SortType.BestRate}
                    pointerEvents='none'
                  />
                </Flex>
                <Flex
                  as='label'
                  align='center'
                  justify='space-between'
                  width='100%'
                  px={2}
                  py={2}
                  borderRadius='lg'
                  cursor='pointer'
                  htmlFor='sort-lowest-gas'
                  bg={currentSortType === SortType.LowestGas ? 'gray.700' : 'transparent'}
                >
                  <Box fontSize='sm'>{translate('trade.sort.lowestGas')}</Box>
                  <Radio
                    id='sort-lowest-gas'
                    value={SortType.LowestGas}
                    isChecked={currentSortType === SortType.LowestGas}
                    pointerEvents='none'
                  />
                </Flex>
                <Flex
                  as='label'
                  align='center'
                  justify='space-between'
                  width='100%'
                  px={2}
                  py={2}
                  borderRadius='lg'
                  cursor='pointer'
                  htmlFor='sort-fastest'
                  bg={currentSortType === SortType.Fastest ? 'gray.700' : 'transparent'}
                >
                  <Box fontSize='sm'>{translate('trade.sort.fastest')}</Box>
                  <Radio
                    id='sort-fastest'
                    value={SortType.Fastest}
                    isChecked={currentSortType === SortType.Fastest}
                    pointerEvents='none'
                  />
                </Flex>
              </Stack>
            </RadioGroup>
          </InputGroup>
        </FormControl>
      </Row>
    </>
  )
})
