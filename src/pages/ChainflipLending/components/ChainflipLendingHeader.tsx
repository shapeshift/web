import { Card, CardBody, Container, Flex, Heading, Skeleton, Stack } from '@chakra-ui/react'
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
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipFreeBalances } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
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

export const ChainflipLendingHeader = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { accountId, setAccountId } = useChainflipLendingAccount()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

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

  const isUserDataLoading =
    accountId !== undefined && (isFreeBalancesLoading || isPositionsLoading || isLoanLoading)

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
        <Container pt={containerPaddingTop} pb={4} mx='auto'>
          <Display.Desktop>
            <Flex justifyContent='space-between' alignItems='flex-start'>
              <Stack>
                <Heading>{translate('navBar.chainflipLending')}</Heading>
                <Text color='text.subtle' translation='chainflipLending.headerDescription' />
              </Stack>
              {accountId && (
                <AccountDropdown
                  assetId={ethAssetId}
                  onChange={setAccountId}
                  defaultAccountId={accountId}
                  autoSelectHighestBalance
                />
              )}
            </Flex>
          </Display.Desktop>
          <Flex gap={4} my={6} flexWrap='wrap'>
            <SummaryCard
              value={accountId ? freeBalanceTotalFiat : '0'}
              labelKey='chainflipLending.dashboard.freeBalance'
              tooltipKey='chainflipLending.dashboard.freeBalanceTooltip'
              isLoading={isUserDataLoading}
              data-testid='chainflip-lending-summary-free-balance'
            />
            <SummaryCard
              value={accountId ? suppliedTotalFiat : '0'}
              labelKey='chainflipLending.dashboard.supplied'
              tooltipKey='chainflipLending.dashboard.suppliedTooltip'
              isLoading={isUserDataLoading}
              labelColor='blue.200'
              data-testid='chainflip-lending-summary-supplied'
            />
            <SummaryCard
              value={accountId ? totalCollateralFiat : '0'}
              labelKey='chainflipLending.dashboard.collateral'
              tooltipKey='chainflipLending.dashboard.collateralTooltip'
              isLoading={isUserDataLoading}
              labelColor='purple.200'
              data-testid='chainflip-lending-summary-collateral'
            />
            <SummaryCard
              value={accountId ? userBorrowedFiat : '0'}
              labelKey='chainflipLending.dashboard.borrowed'
              tooltipKey='chainflipLending.dashboard.borrowedTooltip'
              isLoading={isUserDataLoading}
              labelColor='red.200'
              data-testid='chainflip-lending-summary-borrowed'
            />
          </Flex>
        </Container>
      </Stack>
    </>
  )
})
