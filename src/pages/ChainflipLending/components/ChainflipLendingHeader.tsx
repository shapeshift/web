import { Button, Card, CardBody, Container, Flex, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipFreeBalances } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'

const responsiveFlex = { base: 'auto', lg: 1 }
const containerPaddingTop = { base: 0, md: 8 }

type SummaryCardProps = {
  value: string
  labelKey: string
  tooltipKey: string
  isLoading: boolean
  labelColor?: string
  'data-testid'?: string
}

const SummaryCard = ({
  value,
  labelKey,
  tooltipKey,
  isLoading,
  labelColor,
  'data-testid': testId,
}: SummaryCardProps) => {
  const translate = useTranslate()

  return (
    <Card flex={responsiveFlex} data-testid={testId}>
      <CardBody>
        <HelperTooltip label={translate(tooltipKey)}>
          <Text
            color={labelColor ?? 'text.subtle'}
            fontWeight='medium'
            fontSize='sm'
            translation={labelKey}
          />
        </HelperTooltip>
        <Skeleton isLoaded={!isLoading}>
          <Amount.Fiat value={value} fontSize='2xl' fontWeight='bold' mt={1} />
        </Skeleton>
      </CardBody>
    </Card>
  )
}

type ChainflipLendingHeaderProps = {
  tabIndex?: number
}

export const ChainflipLendingHeader = memo(({ tabIndex }: ChainflipLendingHeaderProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { dispatch: walletDispatch } = useWallet()
  const { accountId, setAccountId } = useChainflipLendingAccount()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const handleConnectWallet = useCallback(
    () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [walletDispatch],
  )

  const {
    totalSuppliedFiat,
    availableLiquidityFiat,
    totalBorrowedFiat,
    isLoading: isPoolsLoading,
  } = useChainflipLendingPools()

  const { totalFiat: freeBalanceTotalFiat, isLoading: isFreeBalancesLoading } =
    useChainflipFreeBalances()

  const { supplyPositions, isLoading: isPositionsLoading } = useChainflipSupplyPositions()

  const suppliedTotalFiat = useMemo(
    () => supplyPositions.reduce((sum, p) => sum.plus(p.totalAmountFiat), bnOrZero(0)).toFixed(2),
    [supplyPositions],
  )

  const {
    totalCollateralFiat,
    totalBorrowedFiat: userBorrowedFiat,
    isLoading: isLoanLoading,
  } = useChainflipLoanAccount()

  const isUserDataLoading = isFreeBalancesLoading || isPositionsLoading || isLoanLoading

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('navBar.chainflipLending')}</PageHeader.Title>
          </PageHeader.Middle>
        </PageHeader>
      </Display.Mobile>
      <Stack mb={4}>
        <Container pt={containerPaddingTop} pb={4} maxWidth='container.xl'>
          <Display.Desktop>
            <Flex justifyContent='space-between' alignItems='flex-start'>
              <Stack>
                <Heading>{translate('navBar.chainflipLending')}</Heading>
                <Text color='text.subtle' translation='chainflipLending.headerDescription' />
              </Stack>
              <AccountDropdown
                assetId={ethAssetId}
                onChange={setAccountId}
                {...(accountId ? { defaultAccountId: accountId } : {})}
                autoSelectHighestBalance
              />
            </Flex>
          </Display.Desktop>
          <Flex gap={4} my={6} flexWrap='wrap'>
            {accountId && tabIndex === 0 ? (
              <>
                <SummaryCard
                  value={freeBalanceTotalFiat}
                  labelKey='chainflipLending.dashboard.freeBalance'
                  tooltipKey='chainflipLending.dashboard.freeBalanceTooltip'
                  isLoading={isUserDataLoading}
                  data-testid='chainflip-lending-summary-free-balance'
                />
                <SummaryCard
                  value={suppliedTotalFiat}
                  labelKey='chainflipLending.dashboard.supplied'
                  tooltipKey='chainflipLending.dashboard.suppliedTooltip'
                  isLoading={isUserDataLoading}
                  labelColor='blue.200'
                  data-testid='chainflip-lending-summary-supplied'
                />
                <SummaryCard
                  value={totalCollateralFiat}
                  labelKey='chainflipLending.dashboard.collateral'
                  tooltipKey='chainflipLending.dashboard.collateralTooltip'
                  isLoading={isUserDataLoading}
                  labelColor='purple.200'
                  data-testid='chainflip-lending-summary-collateral'
                />
                <SummaryCard
                  value={userBorrowedFiat}
                  labelKey='chainflipLending.dashboard.borrowed'
                  tooltipKey='chainflipLending.dashboard.borrowedTooltip'
                  isLoading={isUserDataLoading}
                  labelColor='red.200'
                  data-testid='chainflip-lending-summary-borrowed'
                />
              </>
            ) : (
              <>
                <SummaryCard
                  value={totalSuppliedFiat}
                  labelKey='chainflipLending.totalSupplied'
                  tooltipKey='chainflipLending.totalSuppliedTooltip'
                  isLoading={isPoolsLoading}
                  labelColor='blue.200'
                  data-testid='chainflip-lending-summary-total-supplied'
                />
                <SummaryCard
                  value={availableLiquidityFiat}
                  labelKey='chainflipLending.availableLiquidity'
                  tooltipKey='chainflipLending.availableLiquidityTooltip'
                  isLoading={isPoolsLoading}
                  labelColor='purple.200'
                  data-testid='chainflip-lending-summary-available-liquidity'
                />
                <SummaryCard
                  value={totalBorrowedFiat}
                  labelKey='chainflipLending.totalBorrowed'
                  tooltipKey='chainflipLending.totalBorrowedTooltip'
                  isLoading={isPoolsLoading}
                  labelColor='red.200'
                  data-testid='chainflip-lending-summary-total-borrowed'
                />
                {!accountId && (
                  <Flex
                    flex={{ base: '100%', md: 1 }}
                    justifyContent={{ base: 'flex-start', md: 'flex-end' }}
                    alignItems='center'
                  >
                    <Button colorScheme='blue' size='sm' onClick={handleConnectWallet}>
                      {translate('common.connectWallet')}
                    </Button>
                  </Flex>
                )}
              </>
            )}
          </Flex>
        </Container>
      </Stack>
    </>
  )
})
