import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Activity } from './components/Activity/Activity'
import { Claim } from './components/Claim/Claim'
import { Overview } from './components/Overview'
import { TCYHeader } from './components/TCYHeader'
import { Widget } from './components/Widget'
import { useTcyStaker } from './queries/useTcyStaker'

import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { Main } from '@/components/Layout/Main'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useLocalStorage } from '@/hooks/useLocalStorage/useLocalStorage'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useSingleAssetMarketDataQuery } from '@/lib/graphql/queries'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import type { WalletId } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from '@/state/slices/portfolioSlice/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const direction: StackDirection = { base: 'column-reverse', xl: 'row' }
const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

const ACCOUNT_DEFAULT_LS_KEY = 'tcy-wallet-id-to-default-tcy-account-id'

export type CurrentAccount = {
  accountId: AccountId | undefined
  accountNumber: number
}

export const TCY = () => {
  const dispatch = useAppDispatch()
  const [userSelectedAccountNumber, setUserSelectedAccountNumber] = useState<number | undefined>()

  const {
    state: { walletInfo, isConnected: isWalletConnected },
  } = useWallet()

  const walletType = useAppSelector(selectWalletType)
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger
  const isConnected = isWalletConnected || isLedgerReadOnly

  const [walletIdToDefaultTcyAccountId, setWalletIdToDefaultTcyAccountId] = useLocalStorage<
    Record<WalletId, AccountId>
  >(ACCOUNT_DEFAULT_LS_KEY, {})

  const defaultTcyAccountId =
    walletInfo !== null ? walletIdToDefaultTcyAccountId?.[walletInfo?.deviceId] : undefined

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
  const { data: defaultStaker } = useTcyStaker(defaultTcyAccountId)

  useEffect(() => {
    if (!currentAccountId || !currentStaker || !walletInfo) return

    const currentAmount = bnOrZero(fromBaseUnit(currentStaker.amount ?? '0', THOR_PRECISION))
    const defaultAmount = defaultStaker
      ? bnOrZero(fromBaseUnit(defaultStaker.amount ?? '0', THOR_PRECISION))
      : undefined

    if (
      defaultTcyAccountId === undefined ||
      (defaultAmount !== undefined && currentAmount.gt(defaultAmount))
    ) {
      setWalletIdToDefaultTcyAccountId({
        ...walletIdToDefaultTcyAccountId,
        [walletInfo.deviceId]: currentAccountId,
      })
    }
  }, [
    currentAccountId,
    currentStaker,
    defaultStaker,
    defaultTcyAccountId,
    dispatch,
    setWalletIdToDefaultTcyAccountId,
    userSelectedAccountNumber,
    walletIdToDefaultTcyAccountId,
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

  useSingleAssetMarketDataQuery({ assetId: tcyAssetId })

  return (
    <Main pb={mainPaddingBottom} headerComponent={tcyHeader} px={4} isSubPage>
      {!isConnected ? (
        <ResultsEmpty
          title={<ButtonWalletPredicate isValidWallet />}
          body={['common.connectWalletToGetStartedWith', { feature: 'TCY' }]}
        />
      ) : (
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
      )}
    </Main>
  )
}
