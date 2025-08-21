import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Activity } from './components/Activity/Activity'
import { Claim } from './components/Claim/Claim'
import { Overview } from './components/Overview'
import { TCYHeader } from './components/TCYHeader'
import { Widget } from './components/Widget'

import { Main } from '@/components/Layout/Main'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

export const TCY = () => {
  const dispatch = useAppDispatch()
  const [userSelectedAccountNumber, setUserSelectedAccountNumber] = useState<number | undefined>()

  const accountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: thorchainChainId }),
  )
  const defaultTcyAccountId = useAppSelector(preferences.selectors.selectDefaultTcyAccountId)

  const activeAccountNumber = useMemo(() => {
    if (userSelectedAccountNumber !== undefined) return userSelectedAccountNumber

    if (defaultTcyAccountId) {
      const index = accountIds.indexOf(defaultTcyAccountId)
      if (index !== -1) return index
    }

    return 0
  }, [userSelectedAccountNumber, defaultTcyAccountId, accountIds])

  const handleAccountNumberChange = useCallback((accountNumber: number) => {
    setUserSelectedAccountNumber(accountNumber)
  }, [])

  const tcyHeader = useMemo(
    () => (
      <TCYHeader
        activeAccountNumber={activeAccountNumber}
        onAccountNumberChange={handleAccountNumberChange}
        accountIds={accountIds}
      />
    ),
    [activeAccountNumber, handleAccountNumberChange, accountIds],
  )

  const isTcyWidgetEnabled = useFeatureFlag('ThorchainTcyWidget')
  const isTcyActivityEnabled = useFeatureFlag('ThorchainTcyActivity')

  useEffect(() => {
    // Dispatch TCY market-data "fetching" as early as possible. This is effectively free anyway, as
    // it's hardcoded to return $1 in market-service
    dispatch(marketApi.endpoints.findByAssetId.initiate(tcyAssetId))
  }, [dispatch])

  return (
    <Main pb={mainPaddingBottom} headerComponent={tcyHeader} px={4} isSubPage>
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Overview activeAccountNumber={activeAccountNumber} />
          <Claim activeAccountNumber={activeAccountNumber} />
          {isTcyActivityEnabled && <Activity activeAccountNumber={activeAccountNumber} />}
        </Stack>
        <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
          {isTcyWidgetEnabled && <Widget activeAccountNumber={activeAccountNumber} />}
        </Stack>
      </Stack>
    </Main>
  )
}
