import { Badge, Button, Card, CardBody, Flex, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText, Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  CHAINFLIP_LENDING_ASSET_BY_ASSET_ID,
  CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET,
} from '@/lib/chainflip/constants'
import type { ChainflipFreeBalanceWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import { useChainflipFreeBalances } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import type { ChainflipLendingPoolWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import type {
  CollateralWithFiat,
  LoanWithFiat,
} from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import type { ChainflipSupplyPositionWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const LENDING_ASSET_IDS = Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[]

// Shared grid for consistent alignment across dashboard sections
const dashboardRowGrid = '1fr 100px 120px'

type AssetRowProps = {
  assetId: AssetId
  children: React.ReactNode
  badge?: React.ReactNode
  onClick?: () => void
}

const AssetRow = ({ assetId, children, badge, onClick }: AssetRowProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) return null

  return (
    <Button
      variant='ghost'
      display='grid'
      gridTemplateColumns={dashboardRowGrid}
      columnGap={4}
      alignItems='center'
      textAlign='left'
      py={4}
      px={2}
      width='full'
      height='auto'
      color='text.base'
      onClick={onClick}
      _hover={onClick ? { bg: 'whiteAlpha.100' } : { bg: 'transparent' }}
      cursor={onClick ? 'pointer' : 'default'}
    >
      <HStack spacing={3}>
        <AssetIcon assetId={assetId} size='sm' />
        <RawText fontWeight='medium'>{asset.name}</RawText>
        {badge}
      </HStack>
      {children}
    </Button>
  )
}

type SectionHeaderProps = {
  titleKey: string
  tooltipKey: string
  totalFiat: string
  isLoading: boolean
  primaryAction?: { labelKey: string; handleClick: () => void; testId?: string }
  secondaryAction?: { labelKey: string; handleClick: () => void; prefix?: string }
}

const SectionHeader = ({
  titleKey,
  tooltipKey,
  totalFiat,
  isLoading,
  primaryAction,
  secondaryAction,
}: SectionHeaderProps) => {
  const translate = useTranslate()

  return (
    <Flex justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={2}>
      <HStack spacing={3}>
        <HelperTooltip label={translate(tooltipKey)}>
          <Text translation={titleKey} fontWeight='bold' fontSize='lg' />
        </HelperTooltip>
        <Skeleton isLoaded={!isLoading}>
          <Amount.Fiat value={totalFiat} fontSize='lg' fontWeight='bold' />
        </Skeleton>
      </HStack>
      <HStack spacing={2}>
        {primaryAction && (
          <Button
            size='sm'
            variant='ghost-filled'
            colorScheme='white'
            onClick={primaryAction.handleClick}
            data-testid={primaryAction.testId}
          >
            + {translate(primaryAction.labelKey)}
          </Button>
        )}
        {secondaryAction && (
          <Button
            size='sm'
            variant='ghost'
            colorScheme='white'
            onClick={secondaryAction.handleClick}
          >
            {secondaryAction.prefix ?? '↑'} {translate(secondaryAction.labelKey)}
          </Button>
        )}
      </HStack>
    </Flex>
  )
}

type EmptyStateProps = {
  titleKey: string
  descriptionKey: string
  actionLabelKey: string
  onAction: () => void
  actionTestId?: string
}

const EmptyState = ({
  titleKey,
  descriptionKey,
  actionLabelKey,
  onAction,
  actionTestId,
}: EmptyStateProps) => {
  const translate = useTranslate()

  return (
    <Stack spacing={3} py={4} alignItems='center' textAlign='center'>
      <Text translation={titleKey} fontWeight='bold' fontSize='md' />
      <Text translation={descriptionKey} color='text.subtle' fontSize='sm' />
      <Button size='md' colorScheme='blue' onClick={onAction} data-testid={actionTestId}>
        + {translate(actionLabelKey)}
      </Button>
    </Stack>
  )
}

// Free Balance Section
const FreeBalanceRow = ({ balance }: { balance: ChainflipFreeBalanceWithFiat }) => {
  const assetId = balance.assetId
  const asset = useAppSelector(state => (assetId ? selectAssetById(state, assetId) : undefined))
  const navigate = useNavigate()

  const handleRowClick = useCallback(() => {
    if (!assetId) return
    navigate(`/chainflip-lending/pool/${assetId}`)
  }, [navigate, assetId])

  if (!assetId || bnOrZero(balance.balanceCryptoPrecision).isZero()) return null

  return (
    <AssetRow assetId={assetId} onClick={handleRowClick}>
      <Flex />
      <Stack spacing={0} alignItems='flex-end'>
        <Amount.Crypto
          value={balance.balanceCryptoPrecision}
          symbol={asset?.symbol ?? ''}
          fontSize='sm'
        />
        <Amount.Fiat value={balance.balanceFiat} fontSize='xs' color='text.subtle' />
      </Stack>
    </AssetRow>
  )
}

export const FreeBalanceSection = memo(() => {
  const chainflipLendingModal = useModal('chainflipLending')
  const { freeBalances, isLoading, totalFiat } = useChainflipFreeBalances()

  const nonZeroBalances = useMemo(
    () => freeBalances.filter(b => b.assetId && bnOrZero(b.balanceCryptoPrecision).gt(0)),
    [freeBalances],
  )

  const handleDeposit = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'deposit', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleWithdraw = useCallback(() => {
    const firstWithBalance = nonZeroBalances[0]?.assetId ?? LENDING_ASSET_IDS[0]
    if (firstWithBalance) {
      chainflipLendingModal.open({ mode: 'withdrawFromChainflip', assetId: firstWithBalance })
    }
  }, [chainflipLendingModal, nonZeroBalances])

  return (
    <Card data-testid='chainflip-lending-free-balance'>
      <CardBody>
        <Stack spacing={4}>
          <SectionHeader
            titleKey='chainflipLending.dashboard.freeBalance'
            tooltipKey='chainflipLending.dashboard.freeBalanceTooltip'
            totalFiat={totalFiat}
            isLoading={isLoading}
            primaryAction={{
              labelKey: 'chainflipLending.dashboard.deposit',
              handleClick: handleDeposit,
              testId: 'chainflip-lending-deposit-action',
            }}
            secondaryAction={
              nonZeroBalances.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.withdraw',
                    handleClick: handleWithdraw,
                  }
                : undefined
            }
          />
          {isLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={10} />
              ))}
            </Stack>
          ) : nonZeroBalances.length > 0 ? (
            <Stack>
              <Flex
                justifyContent='space-between'
                px={2}
                py={1}
                color='text.subtle'
                fontSize='xs'
                fontWeight='bold'
                display='grid'
                gridTemplateColumns={dashboardRowGrid}
                columnGap={4}
              >
                <RawText>Asset</RawText>
                <Flex />
                <RawText textAlign='right'>Balance</RawText>
              </Flex>
              <Stack spacing={0} divider={<Flex borderBottomWidth={1} borderColor='border.base' />}>
                {nonZeroBalances.map(balance =>
                  balance.assetId ? (
                    <FreeBalanceRow key={balance.assetId} balance={balance} />
                  ) : null,
                )}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  )
})

// Supplied Section
const SuppliedRow = ({
  position,
  apy,
}: {
  position: ChainflipSupplyPositionWithFiat
  apy: string
}) => {
  const asset = useAppSelector(state => selectAssetById(state, position.assetId))
  const navigate = useNavigate()

  const handleRowClick = useCallback(() => {
    navigate(`/chainflip-lending/pool/${position.assetId}`)
  }, [navigate, position.assetId])

  return (
    <AssetRow assetId={position.assetId} onClick={handleRowClick}>
      <Amount.Percent
        value={apy}
        color='blue.500'
        fontSize='sm'
        textAlign='right'
        fontWeight='medium'
      />
      <Stack spacing={0} alignItems='flex-end'>
        <Amount.Crypto
          value={position.totalAmountCryptoPrecision}
          symbol={asset?.symbol ?? ''}
          fontSize='sm'
        />
        <Amount.Fiat value={position.totalAmountFiat} fontSize='xs' color='text.subtle' />
      </Stack>
    </AssetRow>
  )
}

export const SuppliedSection = memo(() => {
  const chainflipLendingModal = useModal('chainflipLending')
  const { supplyPositions, isLoading } = useChainflipSupplyPositions()
  const { pools } = useChainflipLendingPools()

  const totalSuppliedFiat = useMemo(
    () => supplyPositions.reduce((sum, p) => sum.plus(p.totalAmountFiat), bnOrZero(0)).toFixed(2),
    [supplyPositions],
  )

  const poolsByAssetId = useMemo(
    () =>
      pools.reduce<Partial<Record<AssetId, ChainflipLendingPoolWithFiat>>>((acc, pool) => {
        if (pool.assetId) acc[pool.assetId] = pool
        return acc
      }, {}),
    [pools],
  )

  const handleSupply = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'supply', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleWithdraw = useCallback(() => {
    const firstPosition = supplyPositions[0]
    if (firstPosition) {
      chainflipLendingModal.open({ mode: 'withdrawSupply', assetId: firstPosition.assetId })
    }
  }, [chainflipLendingModal, supplyPositions])

  return (
    <Card
      data-testid='chainflip-lending-supplied'
      borderStyle={supplyPositions.length === 0 && !isLoading ? 'dashed' : undefined}
      borderWidth={supplyPositions.length === 0 && !isLoading ? 1 : undefined}
    >
      <CardBody>
        <Stack spacing={4}>
          <SectionHeader
            titleKey='chainflipLending.dashboard.supplied'
            tooltipKey='chainflipLending.dashboard.suppliedTooltip'
            totalFiat={totalSuppliedFiat}
            isLoading={isLoading}
            primaryAction={
              supplyPositions.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.deposit',
                    handleClick: handleSupply,
                    testId: 'chainflip-lending-supply-action',
                  }
                : undefined
            }
            secondaryAction={
              supplyPositions.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.withdraw',
                    handleClick: handleWithdraw,
                  }
                : undefined
            }
          />
          {isLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={10} />
              ))}
            </Stack>
          ) : supplyPositions.length > 0 ? (
            <Stack>
              <Flex
                justifyContent='space-between'
                px={2}
                py={1}
                color='text.subtle'
                fontSize='xs'
                fontWeight='bold'
                display='grid'
                gridTemplateColumns={dashboardRowGrid}
                columnGap={4}
              >
                <RawText>Asset</RawText>
                <Text translation='chainflipLending.dashboard.apy' textAlign='right' />
                <RawText textAlign='right'>Supplied</RawText>
              </Flex>
              <Stack spacing={0} divider={<Flex borderBottomWidth={1} borderColor='border.base' />}>
                {supplyPositions.map(position => (
                  <SuppliedRow
                    key={position.assetId}
                    position={position}
                    apy={poolsByAssetId[position.assetId]?.supplyApy ?? '0'}
                  />
                ))}
              </Stack>
            </Stack>
          ) : (
            <EmptyState
              titleKey='chainflipLending.dashboard.noEarningPositions'
              descriptionKey='chainflipLending.dashboard.noEarningPositionsDescription'
              actionLabelKey='chainflipLending.dashboard.deposit'
              onAction={handleSupply}
              actionTestId='chainflip-lending-supplied-empty-cta'
            />
          )}
        </Stack>
      </CardBody>
    </Card>
  )
})

// Collateral Section
const CollateralRow = ({
  collateral,
  isTopupAsset,
}: {
  collateral: CollateralWithFiat
  isTopupAsset: boolean
}) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, collateral.assetId))
  const navigate = useNavigate()

  const handleRowClick = useCallback(() => {
    navigate(`/chainflip-lending/pool/${collateral.assetId}`)
  }, [navigate, collateral.assetId])

  return (
    <AssetRow
      assetId={collateral.assetId}
      badge={
        isTopupAsset && (
          <Badge colorScheme='green' variant='subtle' borderRadius='full' px={2} fontSize='2xs'>
            {translate('chainflipLending.dashboard.topupAsset')}
          </Badge>
        )
      }
      onClick={handleRowClick}
    >
      <Flex />
      <Stack spacing={0} alignItems='flex-end'>
        <Amount.Crypto
          value={collateral.amountCryptoPrecision}
          symbol={asset?.symbol ?? ''}
          fontSize='sm'
        />
        <Amount.Fiat value={collateral.amountFiat} fontSize='xs' color='text.subtle' />
      </Stack>
    </AssetRow>
  )
}

export const CollateralSection = memo(() => {
  const chainflipLendingModal = useModal('chainflipLending')
  const { collateralWithFiat, totalCollateralFiat, loanAccount, isLoading } =
    useChainflipLoanAccount()

  const topupAssetId = useMemo(() => {
    if (!loanAccount?.collateral_topup_asset) return undefined
    return CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[loanAccount.collateral_topup_asset.asset]
  }, [loanAccount?.collateral_topup_asset])

  const handleAddCollateral = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'addCollateral', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleRemoveCollateral = useCallback(() => {
    const firstCollateral = collateralWithFiat[0]
    if (firstCollateral) {
      chainflipLendingModal.open({ mode: 'removeCollateral', assetId: firstCollateral.assetId })
    }
  }, [chainflipLendingModal, collateralWithFiat])

  return (
    <Card
      data-testid='chainflip-lending-collateral'
      borderStyle={collateralWithFiat.length === 0 && !isLoading ? 'dashed' : undefined}
      borderWidth={collateralWithFiat.length === 0 && !isLoading ? 1 : undefined}
    >
      <CardBody>
        <Stack spacing={4}>
          <SectionHeader
            titleKey='chainflipLending.dashboard.collateral'
            tooltipKey='chainflipLending.dashboard.collateralTooltip'
            totalFiat={totalCollateralFiat}
            isLoading={isLoading}
            primaryAction={
              collateralWithFiat.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.deposit',
                    handleClick: handleAddCollateral,
                    testId: 'chainflip-lending-collateral-action',
                  }
                : undefined
            }
            secondaryAction={
              collateralWithFiat.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.withdraw',
                    handleClick: handleRemoveCollateral,
                  }
                : undefined
            }
          />
          {isLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={10} />
              ))}
            </Stack>
          ) : collateralWithFiat.length > 0 ? (
            <Stack>
              <Flex
                justifyContent='space-between'
                px={2}
                py={1}
                color='text.subtle'
                fontSize='xs'
                fontWeight='bold'
                display='grid'
                gridTemplateColumns={dashboardRowGrid}
                columnGap={4}
              >
                <RawText>Asset</RawText>
                <Flex />
                <RawText textAlign='right'>Amount</RawText>
              </Flex>
              <Stack spacing={0} divider={<Flex borderBottomWidth={1} borderColor='border.base' />}>
                {collateralWithFiat.map(collateral => (
                  <CollateralRow
                    key={collateral.assetId}
                    collateral={collateral}
                    isTopupAsset={collateral.assetId === topupAssetId}
                  />
                ))}
              </Stack>
            </Stack>
          ) : (
            <EmptyState
              titleKey='chainflipLending.dashboard.provideCollateral'
              descriptionKey='chainflipLending.dashboard.provideCollateralDescription'
              actionLabelKey='chainflipLending.dashboard.addCollateral'
              onAction={handleAddCollateral}
              actionTestId='chainflip-lending-collateral-empty-cta'
            />
          )}
        </Stack>
      </CardBody>
    </Card>
  )
})

// Borrowed Section
const BorrowedRow = ({ loan, borrowRate }: { loan: LoanWithFiat; borrowRate: string }) => {
  const asset = useAppSelector(state => selectAssetById(state, loan.assetId))
  const navigate = useNavigate()

  const handleRowClick = useCallback(() => {
    navigate(`/chainflip-lending/pool/${loan.assetId}`)
  }, [navigate, loan.assetId])

  return (
    <AssetRow assetId={loan.assetId} onClick={handleRowClick}>
      <Amount.Percent
        value={borrowRate}
        color='yellow.500'
        fontSize='sm'
        textAlign='right'
        fontWeight='medium'
      />
      <Stack spacing={0} alignItems='flex-end'>
        <Amount.Crypto
          value={loan.principalAmountCryptoPrecision}
          symbol={asset?.symbol ?? ''}
          fontSize='sm'
        />
        <Amount.Fiat value={loan.principalAmountFiat} fontSize='xs' color='text.subtle' />
      </Stack>
    </AssetRow>
  )
}

export const BorrowedSection = memo(() => {
  const translate = useTranslate()
  const chainflipLendingModal = useModal('chainflipLending')
  const { loansWithFiat, totalBorrowedFiat, isLoading } = useChainflipLoanAccount()
  const { pools } = useChainflipLendingPools()

  const poolsByAssetId = useMemo(
    () =>
      pools.reduce<Partial<Record<AssetId, ChainflipLendingPoolWithFiat>>>((acc, pool) => {
        if (pool.assetId) acc[pool.assetId] = pool
        return acc
      }, {}),
    [pools],
  )

  const handleBorrow = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'borrow', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleRepay = useCallback(() => {
    const firstLoan = loansWithFiat[0]
    if (firstLoan) {
      chainflipLendingModal.open({
        mode: 'repay',
        assetId: firstLoan.assetId,
        loanId: firstLoan.loanId,
      })
    }
  }, [chainflipLendingModal, loansWithFiat])

  const handleAddCollateral = useCallback(() => {
    const firstAssetId = LENDING_ASSET_IDS[0]
    if (firstAssetId) chainflipLendingModal.open({ mode: 'addCollateral', assetId: firstAssetId })
  }, [chainflipLendingModal])

  const handleVoluntaryLiquidation = useCallback(() => {
    const firstLoan = loansWithFiat[0]
    if (firstLoan) {
      chainflipLendingModal.open({
        mode: 'voluntaryLiquidation',
        assetId: firstLoan.assetId,
        liquidationAction: 'initiate',
      })
    }
  }, [chainflipLendingModal, loansWithFiat])

  return (
    <Card
      data-testid='chainflip-lending-borrowed'
      borderStyle={loansWithFiat.length === 0 && !isLoading ? 'dashed' : undefined}
      borderWidth={loansWithFiat.length === 0 && !isLoading ? 1 : undefined}
    >
      <CardBody>
        <Stack spacing={4}>
          <SectionHeader
            titleKey='chainflipLending.dashboard.borrowed'
            tooltipKey='chainflipLending.dashboard.borrowedTooltip'
            totalFiat={totalBorrowedFiat}
            isLoading={isLoading}
            primaryAction={
              loansWithFiat.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.borrow',
                    handleClick: handleBorrow,
                    testId: 'chainflip-lending-borrow-action',
                  }
                : undefined
            }
            secondaryAction={
              loansWithFiat.length > 0
                ? {
                    labelKey: 'chainflipLending.dashboard.repay',
                    handleClick: handleRepay,
                    prefix: '⟲',
                  }
                : undefined
            }
          />
          {isLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={10} />
              ))}
            </Stack>
          ) : loansWithFiat.length > 0 ? (
            <>
              <Stack>
                <Flex
                  justifyContent='space-between'
                  px={2}
                  py={1}
                  color='text.subtle'
                  fontSize='xs'
                  fontWeight='bold'
                  display='grid'
                  gridTemplateColumns={dashboardRowGrid}
                  columnGap={4}
                >
                  <RawText>Asset</RawText>
                  <Text translation='chainflipLending.dashboard.borrowRate' textAlign='right' />
                  <RawText textAlign='right'>Amount</RawText>
                </Flex>
                <Stack
                  spacing={0}
                  divider={<Flex borderBottomWidth={1} borderColor='border.base' />}
                >
                  {loansWithFiat.map(loan => (
                    <BorrowedRow
                      key={loan.loanId}
                      loan={loan}
                      borrowRate={poolsByAssetId[loan.assetId]?.borrowRate ?? '0'}
                    />
                  ))}
                </Stack>
              </Stack>
              <Button
                variant='link'
                size='sm'
                colorScheme='red'
                onClick={handleVoluntaryLiquidation}
              >
                {translate('chainflipLending.dashboard.cantRepay')}{' '}
                {translate('chainflipLending.dashboard.startLiquidation')} →
              </Button>
            </>
          ) : (
            <EmptyState
              titleKey='chainflipLending.dashboard.noActiveLoans'
              descriptionKey='chainflipLending.dashboard.noActiveLoansDescription'
              actionLabelKey='chainflipLending.dashboard.addCollateral'
              onAction={handleAddCollateral}
              actionTestId='chainflip-lending-borrowed-empty-cta'
            />
          )}
        </Stack>
      </CardBody>
    </Card>
  )
})
