import { Flex, Stack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  BorrowedSection,
  CollateralSection,
  FreeBalanceSection,
  SuppliedSection,
} from '@/pages/ChainflipLending/components/DashboardSections'
import { DashboardSidebar } from '@/pages/ChainflipLending/components/DashboardSidebar'
import { InitView } from '@/pages/ChainflipLending/components/InitView'
import { LoanHealth } from '@/pages/ChainflipLending/components/LoanHealth'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipFreeBalances } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'

export const Dashboard = memo(() => {
  const { isFunded, isLpRegistered } = useChainflipAccount()
  const { freeBalances } = useChainflipFreeBalances()
  const { supplyPositions } = useChainflipSupplyPositions()
  const { collateralWithFiat, loansWithFiat } = useChainflipLoanAccount()

  const hasFreeBalance = useMemo(
    () => freeBalances.some(b => b.assetId && bnOrZero(b.balanceCryptoPrecision).gt(0)),
    [freeBalances],
  )

  const hasAnyPosition = useMemo(
    () =>
      hasFreeBalance ||
      supplyPositions.length > 0 ||
      collateralWithFiat.length > 0 ||
      loansWithFiat.length > 0,
    [hasFreeBalance, supplyPositions, collateralWithFiat, loansWithFiat],
  )

  // Show init view for users with no positions (wallet is connected since Markets.tsx handles no-wallet)
  const showInitView = useMemo(() => {
    if (!isFunded && !isLpRegistered) return true
    return !hasAnyPosition
  }, [isFunded, isLpRegistered, hasAnyPosition])

  if (showInitView) {
    return <InitView />
  }

  return (
    <Flex gap={6} direction={{ base: 'column', lg: 'row' }} alignItems='flex-start'>
      <Stack spacing={4} flex={1} minWidth={0}>
        <LoanHealth />
        <FreeBalanceSection />
        <SuppliedSection />
        <CollateralSection />
        <BorrowedSection />
      </Stack>
      <DashboardSidebar />
    </Flex>
  )
})
