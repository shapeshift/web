import { Box, Button, ButtonGroup, FormControl, InputGroup, Stack } from '@chakra-ui/react'
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

  const sortTypeTranslation = useMemo(() => {
    switch (currentSortType) {
      case SortType.BestRate:
        return translate('trade.sort.bestRate')
      case SortType.LowestGas:
        return translate('trade.sort.lowestGas')
      case SortType.Fastest:
        return translate('trade.sort.fastest')
      default:
        return ''
    }
  }, [currentSortType, translate])

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

  const handleBestRateSortTypeChange = useCallback(
    () => handleSortTypeChange(SortType.BestRate),
    [handleSortTypeChange],
  )

  const handleLowestGasSortTypeChange = useCallback(
    () => handleSortTypeChange(SortType.LowestGas),
    [handleSortTypeChange],
  )

  const handleFastestSortTypeChange = useCallback(
    () => handleSortTypeChange(SortType.Fastest),
    [handleSortTypeChange],
  )

  return (
    <>
      <Row>
        <Row.Label>
          <HelperTooltip label={translate('trade.sort.info')}>
            <Text translation='trade.sort.sortBy' />
          </HelperTooltip>
        </Row.Label>
        <Row.Value>{sortTypeTranslation}</Row.Value>
      </Row>
      <Row py={2} gap={2} mt={2}>
        <FormControl>
          <InputGroup variant='filled' width='full'>
            <Stack
              bg='background.input.base'
              px={1}
              py={1}
              borderRadius='xl'
              width='100%'
              direction='column'
            >
              <Button
                onClick={handleBestRateSortTypeChange}
                isActive={currentSortType === SortType.BestRate}
                variant='ghost'
                width='100%'
                justifyContent='flex-start'
                fontSize='sm'
                fontWeight='normal'
              >
                {translate('trade.sort.bestRate')}
              </Button>
              <Button
                onClick={handleLowestGasSortTypeChange}
                isActive={currentSortType === SortType.LowestGas}
                variant='ghost'
                width='100%'
                justifyContent='flex-start'
                fontSize='sm'
                fontWeight='normal'
              >
                {translate('trade.sort.lowestGas')}
              </Button>
              <Button
                onClick={handleFastestSortTypeChange}
                isActive={currentSortType === SortType.Fastest}
                variant='ghost'
                width='100%'
                justifyContent='flex-start'
                fontSize='sm'
                fontWeight='normal'
              >
                {translate('trade.sort.fastest')}
              </Button>
            </Stack>
          </InputGroup>
        </FormControl>
      </Row>
    </>
  )
})
