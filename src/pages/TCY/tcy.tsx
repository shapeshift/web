import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Activity } from './components/Activity/Activity'
import { Claim } from './components/Claim/Claim'
import { Overview } from './components/Overview'
import { TCYHeader } from './components/TCYHeader'
import { Widget } from './components/Widget'
import { useTcyStaker } from './queries/useTcyStaker'

import { Main } from '@/components/Layout/Main'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from '@/state/slices/portfolioSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

export type CurrentAccount = {
  accountId: string | undefined
  accountNumber: number
}

export const TCY = () => {
  const dispatch = useAppDispatch()
  const [userSelectedAccountNumber, setUserSelectedAccountNumber] = useState<number | undefined>()

  const {
    state: { walletInfo },
  } = useWallet()

  const walletIdToDefaultTcyAccountId = useAppSelector(
    preferences.selectors.selectWalletIdToDefaultTcyAccountId,
  )
  const defaultTcyAccountId =
    walletInfo !== null ? walletIdToDefaultTcyAccountId[walletInfo?.deviceId] : undefined

  const activeAccountNumber = useMemo(() => {
    if (userSelectedAccountNumber !== undefined) return userSelectedAccountNumber

    if (defaultTcyAccountId) {
      const accountNumber = selectAccountNumberByAccountId(store.getState(), {
        accountId: defaultTcyAccountId,
      })
      if (accountNumber !== undefined) return accountNumber
    }

    return 0
  }, [userSelectedAccountNumber, defaultTcyAccountId])

  const handleAccountNumberChange = useCallback((accountNumber: number) => {
    setUserSelectedAccountNumber(accountNumber)
  }, [])

  // Track the default account with highest staked balance
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )
  const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
  const currentAccountId = accountNumberAccounts?.[thorchainChainId]

  const currentAccount = useMemo(
    () => ({
      accountId: currentAccountId,
      accountNumber: activeAccountNumber,
    }),
    [currentAccountId, activeAccountNumber],
  )
  const { data: currentStaker } = useTcyStaker(currentAccountId)

  // Only fetch default account to compare if use selects something
  const compareTargetAccountId =
    userSelectedAccountNumber !== undefined ? defaultTcyAccountId : undefined
  const { data: defaultStaker } = useTcyStaker(compareTargetAccountId)

  useEffect(() => {
    if (!currentAccountId || !currentStaker || !defaultStaker || !userSelectedAccountNumber) return

    const currentAmount = bnOrZero(fromBaseUnit(currentStaker.amount ?? '0', THOR_PRECISION))
    const defaultAmount = bnOrZero(fromBaseUnit(defaultStaker.amount ?? '0', THOR_PRECISION))

    if (currentAmount.gt(defaultAmount) && walletInfo !== null) {
      dispatch(
        preferences.actions.setDefaultAccountIdForWallet({
          accountId: currentAccountId,
          walletId: walletInfo.deviceId,
        }),
      )
    }
  }, [
    currentAccountId,
    currentStaker,
    defaultStaker,
    dispatch,
    userSelectedAccountNumber,
    walletInfo,
  ])

  const tcyHeader = useMemo(
    () => (
      <TCYHeader
        currentAccount={currentAccount}
        onAccountNumberChange={handleAccountNumberChange}
      />
    ),
    [currentAccount, handleAccountNumberChange],
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
          <Overview currentAccount={currentAccount} />
          <Claim currentAccount={currentAccount} />
          {isTcyActivityEnabled && <Activity currentAccount={currentAccount} />}
        </Stack>
        <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
          {isTcyWidgetEnabled && <Widget currentAccount={currentAccount} />}
        </Stack>
      </Stack>
    </Main>
  )
}
