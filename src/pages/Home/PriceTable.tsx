import { Flex, Heading, Select, Stack } from '@chakra-ui/react'
import React, { useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import { selectSelectedHomeView } from 'state/selectors'
import { HomeMarketView, preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TopAssetsTable } from './TopAssetsTable'
import { WatchlistTable } from './WatchlistTable'

export const PriceTable = () => {
  const selectedHomeView = useAppSelector(selectSelectedHomeView)
  const dispatch = useAppDispatch()

  const handleViewChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as unknown as HomeMarketView
      dispatch(preferences.actions.setHomeMarketView(value))
    },
    [dispatch],
  )

  const body = useMemo(() => {
    switch (selectedHomeView) {
      case HomeMarketView.TopAssets:
        return <TopAssetsTable />
      case HomeMarketView.Watchlist:
        return <WatchlistTable />
      default:
        return <></>
    }
  }, [selectedHomeView])

  return (
    <Stack>
      <Flex alignItems='center' justifyContent='space-between' px={6}>
        <Heading as='h6'>
          <Text translation='common.prices' />
        </Heading>
        <Select
          width='auto'
          variant='filled'
          size='sm'
          fontWeight='semibold'
          borderRadius='lg'
          onChange={handleViewChange}
          value={selectedHomeView}
        >
          <option value={HomeMarketView.TopAssets}>Top Assets</option>
          <option value={HomeMarketView.Watchlist}>Watchlist</option>
        </Select>
      </Flex>
      {body}
    </Stack>
  )
}
