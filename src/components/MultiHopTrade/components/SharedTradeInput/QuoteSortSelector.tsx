import { Button, ButtonGroup, FormControl, InputGroup } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text'
import { selectQuoteSortOption } from '@/state/slices/tradeQuoteSlice/selectors'
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
  const currentSortOption = useAppSelector(selectQuoteSortOption)

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
      let sortOption: QuoteSortOption
      switch (sortType) {
        case SortType.LowestGas:
          sortOption = QuoteSortOption.LOWEST_GAS
          break
        case SortType.Fastest:
          sortOption = QuoteSortOption.FASTEST
          break
        case SortType.BestRate:
        default:
          sortOption = QuoteSortOption.BEST_RATE
      }
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
        <Row.Value>
          {currentSortType === SortType.BestRate && translate('trade.sort.bestRate')}
          {currentSortType === SortType.LowestGas && translate('trade.sort.lowestGas')}
          {currentSortType === SortType.Fastest && translate('trade.sort.fastest')}
        </Row.Value>
      </Row>
      <Row py={2} gap={2} mt={2}>
        <Row.Value>
          <FormControl>
            <InputGroup variant='filled'>
              <ButtonGroup
                size='sm'
                bg='background.input.base'
                px={1}
                py={1}
                borderRadius='xl'
                variant='ghost'
                isAttached
                width='full'
              >
                <Button
                  onClick={handleBestRateSortTypeChange}
                  isActive={currentSortType === SortType.BestRate}
                >
                  {translate('trade.sort.bestRate')}
                </Button>
                <Button
                  onClick={handleLowestGasSortTypeChange}
                  isActive={currentSortType === SortType.LowestGas}
                >
                  {translate('trade.sort.lowestGas')}
                </Button>
                <Button
                  onClick={handleFastestSortTypeChange}
                  isActive={currentSortType === SortType.Fastest}
                >
                  {translate('trade.sort.fastest')}
                </Button>
              </ButtonGroup>
            </InputGroup>
          </FormControl>
        </Row.Value>
      </Row>
    </>
  )
})
