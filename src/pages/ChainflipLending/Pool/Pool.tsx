import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Stack,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TagLabel,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import type { Property } from 'csstype'
import React, { useCallback, useMemo, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { Display } from '@/components/Display'
import { FormHeader } from '@/components/FormHeader'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import type { ChainflipLendingModalMode } from '@/components/Modals/ChainflipLending/types'
import { RawText } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { permillToDecimal } from '@/lib/chainflip/utils'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { NextStepsArt, NextStepsCard } from '@/pages/ChainflipLending/components/DashboardSidebar'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'
import { useChainflipSafeModeStatuses } from '@/pages/ChainflipLending/hooks/useChainflipSafeModeStatuses'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { BorrowRateChart } from '@/pages/ChainflipLending/Pool/components/BorrowRateChart'
import { LtvGauge } from '@/pages/ChainflipLending/Pool/components/Borrow/LtvGauge'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { useAppSelector } from '@/state/store'

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }
const actionColumnMaxWidth = { base: '100%', lg: '500px' }

enum PoolTabIndex {
  Supply = 0,
  Collateral = 1,
  Borrow = 2,
}

const ACTION_TAB_ITEMS = [
  { label: 'chainflipLending.supply.title', index: PoolTabIndex.Supply },
  { label: 'chainflipLending.collateral.title', index: PoolTabIndex.Collateral },
  { label: 'chainflipLending.borrow.title', index: PoolTabIndex.Borrow },
]

type PoolHeaderProps = {
  assetId: AssetId
  accountId: AccountId | undefined
  setAccountId: (accountId: AccountId | undefined) => void
}

const PoolHeader: React.FC<PoolHeaderProps> = ({ assetId, accountId, setAccountId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/chainflip-lending')
  }, [navigate])

  if (!asset) return null

  return (
    <PageHeader>
      <PageHeader.Left>
        <PageBackButton onBack={handleBack} />
        <Display.Desktop>
          <Flex alignItems='center' gap={2}>
            <AssetIcon assetId={assetId} size='sm' />
            <PageHeader.Title>
              {asset.name} {translate('chainflipLending.market')}
            </PageHeader.Title>
          </Flex>
        </Display.Desktop>
      </PageHeader.Left>
      <Display.Mobile>
        <PageHeader.Middle>
          <PageHeader.Title>
            {asset.name} {translate('chainflipLending.market')}
          </PageHeader.Title>
        </PageHeader.Middle>
      </Display.Mobile>
      {accountId && (
        <PageHeader.Right>
          <AccountDropdown
            assetId={ethAssetId}
            onChange={setAccountId}
            defaultAccountId={accountId}
            autoSelectHighestBalance
            buttonProps={{ variant: 'ghost', size: 'sm' }}
          />
        </PageHeader.Right>
      )}
    </PageHeader>
  )
}

type StatBoxProps = {
  label: string
  tooltip?: string
  children: React.ReactNode
  isLoading: boolean
}

const StatBox: React.FC<StatBoxProps> = ({ label, tooltip, children, isLoading }) => (
  <Box>
    <Tooltip label={tooltip} hasArrow placement='top' isDisabled={!tooltip}>
      <HStack spacing={1} mb={1} display='inline-flex' cursor={tooltip ? 'help' : 'default'}>
        <RawText fontSize='sm' color='text.subtle'>
          {label}
        </RawText>
        {tooltip && <Icon as={FaInfoCircle} boxSize={3} color='text.subtle' />}
      </HStack>
    </Tooltip>
    <Skeleton isLoaded={!isLoading}>{children}</Skeleton>
  </Box>
)

export const Pool = () => {
  const translate = useTranslate()
  const location = useLocation()
  const { dispatch: walletDispatch } = useWallet()
  const { accountId, setAccountId } = useChainflipLendingAccount()
  const [actionTabIndex, setActionTabIndex] = useState(PoolTabIndex.Supply)
  const chainflipLendingModal = useModal('chainflipLending')

  const handleConnectWallet = useCallback(
    () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [walletDispatch],
  )

  const poolAssetId = useMemo(() => {
    const [, ...rest] = location.pathname.split('/pool/')
    return (rest.join('/') || '') as AssetId
  }, [location.pathname])

  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))
  const { pools, isLoading } = useChainflipLendingPools()
  const { supplyPositions, isLoading: isPositionsLoading } = useChainflipSupplyPositions()
  const {
    loanAccount,
    collateralWithFiat,
    loansWithFiat,
    totalCollateralFiat,
    totalBorrowedFiat: userBorrowedFiat,
  } = useChainflipLoanAccount()

  const isVoluntaryLiquidationActive = useMemo(() => {
    if (!loanAccount?.liquidation_status) return false
    const status = loanAccount.liquidation_status as Record<string, unknown>
    return status.liquidation_type === 'Voluntary'
  }, [loanAccount?.liquidation_status])
  const { freeBalances } = useChainflipAccount()

  const poolData = useMemo(() => pools.find(p => p.assetId === poolAssetId), [pools, poolAssetId])

  const supplyPosition = useMemo(
    () => supplyPositions.find(p => p.assetId === poolAssetId),
    [supplyPositions, poolAssetId],
  )

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[poolAssetId], [poolAssetId])

  const hasFreeBalance = useMemo(() => {
    if (!freeBalances || !cfAsset) return false
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    return bnOrZero(matching?.balance).gt(0)
  }, [freeBalances, cfAsset])

  const freeBalanceCryptoPrecision = useMemo(() => {
    if (!freeBalances || !cfAsset || !asset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    if (!matching?.balance) return '0'
    return BigAmount.fromBaseUnit({
      value: matching.balance,
      precision: asset.precision,
    }).toPrecision()
  }, [freeBalances, cfAsset, asset])

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, poolAssetId),
  )

  const freeBalanceFiat = useMemo(() => {
    if (!marketData?.price) return undefined
    return bnOrZero(freeBalanceCryptoPrecision).times(marketData.price).toFixed(2)
  }, [freeBalanceCryptoPrecision, marketData?.price])

  const hasSupplyPosition = useMemo(
    () => bnOrZero(supplyPosition?.totalAmountCryptoPrecision).gt(0),
    [supplyPosition],
  )

  const headerComponent = useMemo(
    () => <PoolHeader assetId={poolAssetId} accountId={accountId} setAccountId={setAccountId} />,
    [poolAssetId, accountId, setAccountId],
  )

  const actionTabHeader = useMemo(
    () => (
      <FormHeader
        items={ACTION_TAB_ITEMS}
        setStepIndex={setActionTabIndex}
        activeIndex={actionTabIndex}
      />
    ),
    [actionTabIndex],
  )

  const poolCollateral = useMemo(
    () => collateralWithFiat.find(c => c.assetId === poolAssetId),
    [collateralWithFiat, poolAssetId],
  )

  const poolLoan = useMemo(
    () => loansWithFiat.find(loan => loan.assetId === poolAssetId),
    [loansWithFiat, poolAssetId],
  )

  const utilisationPercent = useMemo(
    () => (poolData ? permillToDecimal(poolData.pool.utilisation_rate) : '0'),
    [poolData],
  )

  const originationFee = useMemo(
    () => (poolData ? permillToDecimal(poolData.pool.origination_fee) : '0'),
    [poolData],
  )

  const liquidationFee = useMemo(
    () => (poolData ? permillToDecimal(poolData.pool.liquidation_fee) : '0'),
    [poolData],
  )

  const totalBorrowedFiat = useMemo(
    () =>
      bnOrZero(poolData?.totalAmountFiat)
        .minus(poolData?.availableAmountFiat ?? '0')
        .toFixed(2),
    [poolData],
  )

  const handleOpenModal = useCallback(
    (mode: ChainflipLendingModalMode) => {
      chainflipLendingModal.open({ mode, assetId: poolAssetId })
    },
    [chainflipLendingModal, poolAssetId],
  )

  const handleSupply = useCallback(() => handleOpenModal('supply'), [handleOpenModal])
  const handleWithdrawSupply = useCallback(
    () => handleOpenModal('withdrawSupply'),
    [handleOpenModal],
  )
  const handleDeposit = useCallback(() => handleOpenModal('deposit'), [handleOpenModal])
  const handleWithdrawFromChainflip = useCallback(
    () => handleOpenModal('withdrawFromChainflip'),
    [handleOpenModal],
  )
  const handleAddCollateral = useCallback(() => handleOpenModal('addCollateral'), [handleOpenModal])
  const handleRemoveCollateral = useCallback(
    () => handleOpenModal('removeCollateral'),
    [handleOpenModal],
  )
  const handleBorrow = useCallback(() => handleOpenModal('borrow'), [handleOpenModal])
  const handleRepay = useCallback(() => {
    if (poolLoan) {
      chainflipLendingModal.open({ mode: 'repay', assetId: poolAssetId, loanId: poolLoan.loanId })
    }
  }, [chainflipLendingModal, poolAssetId, poolLoan])

  const hasCollateral = useMemo(() => bnOrZero(totalCollateralFiat).gt(0), [totalCollateralFiat])
  const hasPoolCollateral = useMemo(
    () => bnOrZero(poolCollateral?.amountFiat).gt(0),
    [poolCollateral?.amountFiat],
  )
  const hasLoans = useMemo(() => Boolean(poolLoan), [poolLoan])
  const {
    canDepositToChainflip,
    canWithdrawFromChainflip,
    canSupply,
    canWithdrawSupply,
    canAddCollateral,
    canRemoveCollateral,
    canBorrow,
    canLiquidate,
    isLoading: isSafeModeStatusesLoading,
  } = useChainflipSafeModeStatuses(poolAssetId)

  const { thresholds } = useChainflipLtvThresholds()

  const currentLtvDecimal = useMemo(() => {
    if (!loanAccount?.ltv_ratio) return 0
    try {
      return Number(BigInt(loanAccount.ltv_ratio)) / 1_000_000_000
    } catch {
      return 0
    }
  }, [loanAccount?.ltv_ratio])

  const currentLtvPercent = useMemo(() => (currentLtvDecimal * 100).toFixed(1), [currentLtvDecimal])

  const ltvStatusColor = useMemo(() => {
    if (currentLtvDecimal >= 0.9) return 'red.500'
    if (currentLtvDecimal >= 0.8) return 'yellow.500'
    return 'green.500'
  }, [currentLtvDecimal])

  const maxLtvDecimal = useMemo(() => thresholds?.target ?? 0, [thresholds])

  const liquidationLtvDecimal = useMemo(
    () => thresholds?.softLiquidation ?? 0,
    [thresholds],
  )

  const ltvZoneLabel = useMemo(() => {
    if (!thresholds) return ''
    if (currentLtvDecimal >= thresholds.softLiquidation)
      return translate('chainflipLending.ltv.liquidation')
    if (currentLtvDecimal >= thresholds.target) return translate('chainflipLending.ltv.risky')
    if (currentLtvDecimal >= thresholds.lowLtv) return translate('chainflipLending.ltv.optimal')
    return translate('chainflipLending.ltv.conservative')
  }, [currentLtvDecimal, thresholds, translate])

  // True only when user has funded CF account but has no positions of any kind
  const hasNoPositions = useMemo(
    () => !hasFreeBalance && !hasSupplyPosition && !hasCollateral && !hasLoans,
    [hasFreeBalance, hasSupplyPosition, hasCollateral, hasLoans],
  )

  const handleVoluntaryLiquidation = useCallback(
    (action: 'initiate' | 'stop') => {
      chainflipLendingModal.open({
        mode: 'voluntaryLiquidation',
        assetId: poolAssetId,
        liquidationAction: action,
      })
    },
    [chainflipLendingModal, poolAssetId],
  )

  if (!asset) return null

  const actionPausedLabel = translate('chainflipLending.pool.actionPaused')
  const supplyTooltipLabel = !canSupply
    ? actionPausedLabel
    : !hasFreeBalance
    ? translate('chainflipLending.pool.noFreeBalance')
    : undefined
  const withdrawSupplyTooltipLabel = !canWithdrawSupply
    ? actionPausedLabel
    : !hasSupplyPosition
    ? translate('chainflipLending.pool.noSupplyPosition')
    : undefined
  const depositTooltipLabel = !canDepositToChainflip ? actionPausedLabel : undefined
  const withdrawFromChainflipTooltipLabel = !canWithdrawFromChainflip
    ? actionPausedLabel
    : !hasFreeBalance
    ? translate('chainflipLending.pool.noFreeBalance')
    : undefined
  const addCollateralTooltipLabel = !canAddCollateral
    ? actionPausedLabel
    : !hasFreeBalance
    ? translate('chainflipLending.pool.noFreeBalance')
    : undefined
  const removeCollateralTooltipLabel = !canRemoveCollateral
    ? actionPausedLabel
    : !hasPoolCollateral
    ? translate('chainflipLending.pool.noCollateral')
    : undefined
  const borrowTooltipLabel = !canBorrow
    ? actionPausedLabel
    : !hasCollateral
    ? translate('chainflipLending.pool.noCollateral')
    : undefined
  const liquidateTooltipLabel = !canLiquidate ? actionPausedLabel : undefined

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={`${asset.name} - Chainflip Lending`} />
      <Flex gap={6} flexDir={flexDirPool}>
        <Stack gap={4} flex={1}>
          <Card data-testid='chainflip-pool-supply-stats'>
            <CardBody>
              <Heading as='h5' fontSize='sm' textTransform='uppercase' color='text.subtle' mb={4}>
                {translate('chainflipLending.supplyStats')}
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                <StatBox
                  label={translate('chainflipLending.totalSupplied')}
                  tooltip={translate('chainflipLending.totalSuppliedTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Fiat
                    value={poolData?.totalAmountFiat ?? '0'}
                    fontSize='xl'
                    fontWeight='medium'
                  />
                  <Amount.Crypto
                    value={poolData?.totalAmountCryptoPrecision ?? '0'}
                    symbol={asset.symbol}
                    fontSize='sm'
                    color='text.subtle'
                  />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.supplyApy')}
                  tooltip={translate('chainflipLending.supplyApyTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent
                    value={poolData?.supplyApy ?? '0'}
                    fontSize='xl'
                    fontWeight='medium'
                    autoColor
                  />
                  <RawText fontSize='xs' color='text.subtle'>
                    {translate('chainflipLending.pool.currentRate')}
                  </RawText>
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.availableLiquidity')}
                  tooltip={translate('chainflipLending.availableLiquidityTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Fiat
                    value={poolData?.availableAmountFiat ?? '0'}
                    fontSize='xl'
                    fontWeight='medium'
                  />
                </StatBox>
              </SimpleGrid>
            </CardBody>
          </Card>

          <Card data-testid='chainflip-pool-borrow-stats'>
            <CardBody>
              <Heading as='h5' fontSize='sm' textTransform='uppercase' color='text.subtle' mb={4}>
                {translate('chainflipLending.borrowStats')}
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                <StatBox
                  label={translate('chainflipLending.totalBorrowed')}
                  tooltip={translate('chainflipLending.totalBorrowedTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Fiat value={totalBorrowedFiat} fontSize='xl' fontWeight='medium' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.borrowApr')}
                  tooltip={translate('chainflipLending.borrowAprTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent
                    value={poolData?.borrowRate ?? '0'}
                    fontSize='xl'
                    fontWeight='medium'
                  />
                  <RawText fontSize='xs' color='text.subtle'>
                    {translate('chainflipLending.pool.currentRate')}
                  </RawText>
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.utilisation')}
                  tooltip={translate('chainflipLending.utilisationTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent value={utilisationPercent} fontSize='xl' fontWeight='medium' />
                  <RawText fontSize='xs' color='text.subtle'>
                    {translate('chainflipLending.pool.ofCurrentPool')}
                  </RawText>
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.maxLtv')}
                  tooltip={translate('chainflipLending.maxLtvTooltip')}
                  isLoading={isLoading || isSafeModeStatusesLoading}
                >
                  <Amount.Percent value={maxLtvDecimal} fontSize='xl' fontWeight='medium' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.originationFee')}
                  tooltip={translate('chainflipLending.originationFeeTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent value={originationFee} fontSize='xl' fontWeight='medium' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.liquidationLtv')}
                  tooltip={translate('chainflipLending.liquidationLtvTooltip')}
                  isLoading={isLoading || isSafeModeStatusesLoading}
                >
                  <Amount.Percent value={liquidationLtvDecimal} fontSize='xl' fontWeight='medium' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.liquidationFee')}
                  tooltip={translate('chainflipLending.liquidationFeeTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent value={liquidationFee} fontSize='xl' fontWeight='medium' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.availableLiquidity')}
                  tooltip={translate('chainflipLending.availableLiquidityTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Fiat
                    value={poolData?.availableAmountFiat ?? '0'}
                    fontSize='xl'
                    fontWeight='medium'
                  />
                  <RawText fontSize='xs' color='text.subtle'>
                    {translate('chainflipLending.pool.forImmediateSupply')}
                  </RawText>
                </StatBox>
              </SimpleGrid>
            </CardBody>
          </Card>

          {cfAsset && <BorrowRateChart asset={cfAsset.asset} />}
        </Stack>

        <Stack
          maxW={actionColumnMaxWidth}
          w='full'
          position='sticky'
          top={4}
          alignSelf='flex-start'
          gap={4}
        >
          {!accountId ? (
            <Card>
              <CardBody p={4}>
                <Button
                  colorScheme='blue'
                  size='lg'
                  height={12}
                  borderRadius='xl'
                  onClick={handleConnectWallet}
                  width='full'
                  fontWeight='bold'
                >
                  {translate('common.connectWallet')}
                </Button>
              </CardBody>
            </Card>
          ) : hasNoPositions ? (
            // No free balance and no positions — prompt user to add funds
            <Card overflow='hidden' data-testid='chainflip-pool-add-funds'>
              <CardBody pt={0}>
                <Stack spacing={5}>
                  <NextStepsArt colorScheme='green' />
                  <RawText fontWeight='bold' fontSize='md'>
                    {translate('chainflipLending.dashboard.yourNextSteps')}
                  </RawText>
                  <RawText fontSize='sm' color='text.subtle'>
                    {translate('chainflipLending.pool.addFundsDescription')}
                  </RawText>
                  <Tooltip
                    label={depositTooltipLabel}
                    isDisabled={!depositTooltipLabel}
                    shouldWrapChildren
                    hasArrow
                  >
                    <Button
                      data-testid='chainflip-pool-add-funds-open'
                      colorScheme='blue'
                      size='lg'
                      height={10}
                      borderRadius='xl'
                      width='full'
                      fontWeight='semibold'
                      onClick={handleDeposit}
                      isDisabled={isSafeModeStatusesLoading || !canDepositToChainflip}
                    >
                      {translate('chainflipLending.pool.addFunds')}
                    </Button>
                  </Tooltip>
                </Stack>
              </CardBody>
            </Card>
          ) : (
            // 3-tab action panel
            <Card data-testid='chainflip-pool-actions'>
              <CardBody px={0} py={0}>
                <Tabs index={actionTabIndex}>
                  {actionTabHeader}
                  <TabPanels>
                    {/* ── Supply tab ── */}
                    <TabPanel p={4} data-testid='chainflip-tab-supply'>
                      <VStack spacing={3} align='stretch'>
                        {!hasSupplyPosition ? (
                          // Empty state
                          <VStack spacing={3} align='stretch'>
                            <VStack spacing={1} align='flex-start'>
                              <RawText fontSize='sm' fontWeight='medium'>
                                {translate('chainflipLending.pool.noEarningPositions')}
                              </RawText>
                              <RawText fontSize='xs' color='text.subtle'>
                                {translate('chainflipLending.pool.noEarningPositionsDescription')}
                              </RawText>
                            </VStack>
                            <Tooltip
                              label={depositTooltipLabel}
                              isDisabled={!depositTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-supply-deposit-open'
                                colorScheme='blue'
                                size='lg'
                                height={12}
                                borderRadius='xl'
                                width='full'
                                fontWeight='bold'
                                onClick={handleDeposit}
                                isDisabled={
                                  isSafeModeStatusesLoading || !canDepositToChainflip || !accountId
                                }
                              >
                                + {translate('chainflipLending.pool.depositToChainflip')}
                              </Button>
                            </Tooltip>
                          </VStack>
                        ) : (
                          // Supply position
                          <VStack spacing={3} align='stretch'>
                            <Flex justifyContent='space-between' alignItems='flex-start'>
                              <RawText fontSize='sm' color='text.subtle'>
                                {translate('chainflipLending.supplied')}
                              </RawText>
                              <Skeleton isLoaded={!isPositionsLoading}>
                                <VStack spacing={0} align='flex-end'>
                                  <Amount.Fiat
                                    value={supplyPosition?.totalAmountFiat ?? '0'}
                                    fontSize='sm'
                                    fontWeight='medium'
                                  />
                                  <HStack spacing={1} justify='flex-end'>
                                    <Amount.Crypto
                                      value={supplyPosition?.totalAmountCryptoPrecision ?? '0'}
                                      symbol={asset.symbol}
                                      fontSize='xs'
                                      color='text.subtle'
                                    />
                                    {poolData?.supplyApy && (
                                      <Tag size='sm' colorScheme='green' borderRadius='full'>
                                        <TagLabel fontSize='xs'>
                                          <Amount.Percent
                                            value={poolData.supplyApy}
                                            suffix=' APY'
                                            color='green.300'
                                            fontSize='xs'
                                          />
                                        </TagLabel>
                                      </Tag>
                                    )}
                                  </HStack>
                                </VStack>
                              </Skeleton>
                            </Flex>
                            <HStack spacing={3}>
                              <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                                <Tooltip
                                  label={supplyTooltipLabel}
                                  isDisabled={!supplyTooltipLabel}
                                  shouldWrapChildren
                                  hasArrow
                                >
                                  <Button
                                    data-testid='chainflip-tab-supply-open'
                                    colorScheme='blue'
                                    size='lg'
                                    height={12}
                                    borderRadius='xl'
                                    width='full'
                                    fontWeight='bold'
                                    onClick={handleSupply}
                                    isDisabled={
                                      isSafeModeStatusesLoading ||
                                      !canSupply ||
                                      !hasFreeBalance ||
                                      !accountId
                                    }
                                  >
                                    + {translate('chainflipLending.pool.supply')}
                                  </Button>
                                </Tooltip>
                              </Box>
                              <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                                <Tooltip
                                  label={withdrawSupplyTooltipLabel}
                                  isDisabled={!withdrawSupplyTooltipLabel}
                                  shouldWrapChildren
                                  hasArrow
                                >
                                  <Button
                                    data-testid='chainflip-tab-withdraw-supply-open'
                                    variant='outline'
                                    colorScheme='blue'
                                    size='lg'
                                    height={12}
                                    borderRadius='xl'
                                    width='full'
                                    fontWeight='bold'
                                    onClick={handleWithdrawSupply}
                                    isDisabled={
                                      isSafeModeStatusesLoading ||
                                      !canWithdrawSupply ||
                                      !hasSupplyPosition ||
                                      !accountId
                                    }
                                  >
                                    {translate('common.withdraw')}
                                  </Button>
                                </Tooltip>
                              </Box>
                            </HStack>
                          </VStack>
                        )}

                        {/* Inline free balance row */}
                        <Divider />
                        <Flex justifyContent='space-between' alignItems='center'>
                          <RawText fontSize='sm' color='text.subtle'>
                            {translate('chainflipLending.pool.freeBalance')}
                          </RawText>
                          <VStack spacing={0} align='flex-end'>
                            {freeBalanceFiat !== undefined && (
                              <Amount.Fiat
                                value={freeBalanceFiat}
                                fontSize='sm'
                                fontWeight='medium'
                              />
                            )}
                            <Amount.Crypto
                              value={freeBalanceCryptoPrecision}
                              symbol={asset.symbol}
                              fontSize='xs'
                              color='text.subtle'
                            />
                          </VStack>
                        </Flex>
                        <HStack spacing={3}>
                          <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                            <Tooltip
                              label={depositTooltipLabel}
                              isDisabled={!depositTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-supply-deposit-funds'
                                colorScheme='blue'
                                size='md'
                                borderRadius='xl'
                                width='full'
                                fontWeight='semibold'
                                onClick={handleDeposit}
                                isDisabled={
                                  isSafeModeStatusesLoading || !canDepositToChainflip || !accountId
                                }
                              >
                                + {translate('chainflipLending.depositToChainflip')}
                              </Button>
                            </Tooltip>
                          </Box>
                          <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                            <Tooltip
                              label={withdrawFromChainflipTooltipLabel}
                              isDisabled={!withdrawFromChainflipTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-supply-egress-funds'
                                variant='outline'
                                colorScheme='blue'
                                size='md'
                                borderRadius='xl'
                                width='full'
                                fontWeight='semibold'
                                onClick={handleWithdrawFromChainflip}
                                isDisabled={
                                  isSafeModeStatusesLoading ||
                                  !canWithdrawFromChainflip ||
                                  !hasFreeBalance ||
                                  !accountId
                                }
                              >
                                {translate('common.withdraw')}
                              </Button>
                            </Tooltip>
                          </Box>
                        </HStack>
                      </VStack>
                    </TabPanel>

                    {/* ── Collateral tab ── */}
                    <TabPanel p={4} data-testid='chainflip-tab-collateral'>
                      <VStack spacing={3} align='stretch'>
                        {!hasPoolCollateral ? (
                          // Empty state
                          <VStack spacing={3} align='stretch'>
                            <VStack spacing={1} align='flex-start'>
                              <RawText fontSize='sm' fontWeight='medium'>
                                {translate('chainflipLending.pool.provideCollateral')}
                              </RawText>
                              <RawText fontSize='xs' color='text.subtle'>
                                {translate('chainflipLending.pool.provideCollateralDescription')}
                              </RawText>
                            </VStack>
                            <Tooltip
                              label={addCollateralTooltipLabel}
                              isDisabled={!addCollateralTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-collateral-add-empty'
                                colorScheme='blue'
                                size='lg'
                                height={12}
                                borderRadius='xl'
                                width='full'
                                fontWeight='bold'
                                onClick={handleAddCollateral}
                                isDisabled={
                                  isSafeModeStatusesLoading ||
                                  !canAddCollateral ||
                                  !hasFreeBalance ||
                                  !accountId
                                }
                              >
                                + {translate('chainflipLending.collateral.add')}
                              </Button>
                            </Tooltip>
                          </VStack>
                        ) : (
                          // Collateral position
                          <VStack spacing={3} align='stretch'>
                            <Flex justifyContent='space-between' alignItems='center'>
                              <RawText fontSize='sm' color='text.subtle'>
                                {translate('chainflipLending.collateral.title')}
                              </RawText>
                              <VStack spacing={0} align='flex-end'>
                                <Amount.Fiat
                                  value={poolCollateral?.amountFiat ?? '0'}
                                  fontSize='sm'
                                  fontWeight='medium'
                                />
                                <Amount.Crypto
                                  value={poolCollateral?.amountCryptoPrecision ?? '0'}
                                  symbol={asset.symbol}
                                  fontSize='xs'
                                  color='text.subtle'
                                />
                              </VStack>
                            </Flex>
                            <Flex justifyContent='space-between' alignItems='center'>
                              <RawText fontSize='sm' color='text.subtle'>
                                {translate('chainflipLending.pool.topUpAsset')}
                              </RawText>
                              <RawText fontSize='sm' fontWeight='medium'>
                                {asset.symbol}
                              </RawText>
                            </Flex>
                            <HStack spacing={3}>
                              <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                                <Tooltip
                                  label={addCollateralTooltipLabel}
                                  isDisabled={!addCollateralTooltipLabel}
                                  shouldWrapChildren
                                  hasArrow
                                >
                                  <Button
                                    data-testid='chainflip-tab-add-collateral-open'
                                    colorScheme='blue'
                                    size='lg'
                                    height={12}
                                    borderRadius='xl'
                                    width='full'
                                    fontWeight='bold'
                                    onClick={handleAddCollateral}
                                    isDisabled={
                                      isSafeModeStatusesLoading ||
                                      !canAddCollateral ||
                                      !hasFreeBalance ||
                                      !accountId
                                    }
                                  >
                                    + {translate('chainflipLending.collateral.add')}
                                  </Button>
                                </Tooltip>
                              </Box>
                              <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                                <Tooltip
                                  label={removeCollateralTooltipLabel}
                                  isDisabled={!removeCollateralTooltipLabel}
                                  shouldWrapChildren
                                  hasArrow
                                >
                                  <Button
                                    data-testid='chainflip-tab-remove-collateral-open'
                                    variant='outline'
                                    colorScheme='blue'
                                    size='lg'
                                    height={12}
                                    borderRadius='xl'
                                    width='full'
                                    fontWeight='bold'
                                    onClick={handleRemoveCollateral}
                                    isDisabled={
                                      isSafeModeStatusesLoading ||
                                      !canRemoveCollateral ||
                                      !hasPoolCollateral ||
                                      !accountId
                                    }
                                  >
                                    {translate('chainflipLending.collateral.remove')}
                                  </Button>
                                </Tooltip>
                              </Box>
                            </HStack>
                          </VStack>
                        )}

                        {/* Inline free balance row */}
                        <Divider />
                        <Flex justifyContent='space-between' alignItems='center'>
                          <RawText fontSize='sm' color='text.subtle'>
                            {translate('chainflipLending.pool.freeBalance')}
                          </RawText>
                          <VStack spacing={0} align='flex-end'>
                            {freeBalanceFiat !== undefined && (
                              <Amount.Fiat
                                value={freeBalanceFiat}
                                fontSize='sm'
                                fontWeight='medium'
                              />
                            )}
                            <Amount.Crypto
                              value={freeBalanceCryptoPrecision}
                              symbol={asset.symbol}
                              fontSize='xs'
                              color='text.subtle'
                            />
                          </VStack>
                        </Flex>
                        <HStack spacing={3}>
                          <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                            <Tooltip
                              label={depositTooltipLabel}
                              isDisabled={!depositTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-collateral-deposit-funds'
                                colorScheme='blue'
                                size='md'
                                borderRadius='xl'
                                width='full'
                                fontWeight='semibold'
                                onClick={handleDeposit}
                                isDisabled={
                                  isSafeModeStatusesLoading || !canDepositToChainflip || !accountId
                                }
                              >
                                + {translate('chainflipLending.depositToChainflip')}
                              </Button>
                            </Tooltip>
                          </Box>
                          <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                            <Tooltip
                              label={withdrawFromChainflipTooltipLabel}
                              isDisabled={!withdrawFromChainflipTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-collateral-egress-funds'
                                variant='outline'
                                colorScheme='blue'
                                size='md'
                                borderRadius='xl'
                                width='full'
                                fontWeight='semibold'
                                onClick={handleWithdrawFromChainflip}
                                isDisabled={
                                  isSafeModeStatusesLoading ||
                                  !canWithdrawFromChainflip ||
                                  !hasFreeBalance ||
                                  !accountId
                                }
                              >
                                {translate('common.withdraw')}
                              </Button>
                            </Tooltip>
                          </Box>
                        </HStack>
                      </VStack>
                    </TabPanel>

                    {/* ── Borrow tab ── */}
                    <TabPanel p={4} data-testid='chainflip-tab-borrow'>
                      <VStack spacing={3} align='stretch'>
                        {!hasLoans ? (
                          // Empty state
                          <VStack spacing={3} align='stretch'>
                            <VStack spacing={1} align='flex-start'>
                              <RawText fontSize='sm' fontWeight='medium'>
                                {translate('chainflipLending.pool.noActiveLoans')}
                              </RawText>
                              <RawText fontSize='xs' color='text.subtle'>
                                {translate('chainflipLending.pool.noActiveLoansDescription')}
                              </RawText>
                            </VStack>
                            <Tooltip
                              label={addCollateralTooltipLabel}
                              isDisabled={!addCollateralTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-borrow-add-collateral'
                                colorScheme='blue'
                                size='lg'
                                height={12}
                                borderRadius='xl'
                                width='full'
                                fontWeight='bold'
                                onClick={handleAddCollateral}
                                isDisabled={
                                  isSafeModeStatusesLoading ||
                                  !canAddCollateral ||
                                  !hasFreeBalance ||
                                  !accountId
                                }
                              >
                                + {translate('chainflipLending.collateral.add')}
                              </Button>
                            </Tooltip>
                          </VStack>
                        ) : (
                          // Active loan
                          <VStack spacing={3} align='stretch'>
                            <Flex justifyContent='space-between' alignItems='flex-start'>
                              <RawText fontSize='sm' color='text.subtle'>
                                {translate('chainflipLending.borrow.borrowed')}
                              </RawText>
                              <VStack spacing={0} align='flex-end'>
                                <Amount.Fiat
                                  value={userBorrowedFiat}
                                  fontSize='sm'
                                  fontWeight='medium'
                                />
                                {poolData?.borrowRate && (
                                  <Tag size='sm' colorScheme='blue' borderRadius='full'>
                                    <TagLabel fontSize='xs'>
                                      <Amount.Percent
                                        value={poolData.borrowRate}
                                        suffix=' APR'
                                        color='blue.300'
                                        fontSize='xs'
                                      />
                                    </TagLabel>
                                  </Tag>
                                )}
                              </VStack>
                            </Flex>
                            <HStack spacing={3}>
                              <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                                <Tooltip
                                  label={borrowTooltipLabel}
                                  isDisabled={!borrowTooltipLabel}
                                  shouldWrapChildren
                                  hasArrow
                                >
                                  <Button
                                    data-testid='chainflip-tab-borrow-open'
                                    colorScheme='blue'
                                    size='lg'
                                    height={12}
                                    borderRadius='xl'
                                    width='full'
                                    fontWeight='bold'
                                    onClick={handleBorrow}
                                    isDisabled={
                                      isSafeModeStatusesLoading ||
                                      !canBorrow ||
                                      !hasCollateral ||
                                      !accountId
                                    }
                                  >
                                    + {translate('chainflipLending.borrow.title')}
                                  </Button>
                                </Tooltip>
                              </Box>
                              <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                                <Tooltip
                                  label={translate('chainflipLending.pool.noLoans')}
                                  isDisabled={hasLoans}
                                  shouldWrapChildren
                                  hasArrow
                                >
                                  <Button
                                    data-testid='chainflip-tab-repay-open'
                                    variant='outline'
                                    colorScheme='blue'
                                    size='lg'
                                    height={12}
                                    borderRadius='xl'
                                    width='full'
                                    fontWeight='bold'
                                    onClick={handleRepay}
                                    isDisabled={!hasLoans || !accountId}
                                  >
                                    {translate('chainflipLending.repay.title')}
                                  </Button>
                                </Tooltip>
                              </Box>
                            </HStack>
                            {/* LTV gauge */}
                            <Box>
                              <Flex justifyContent='space-between' alignItems='center' mb={2}>
                                <RawText
                                  fontSize='xs'
                                  color='text.subtle'
                                  textTransform='uppercase'
                                >
                                  {translate('chainflipLending.pool.currentLtv')}
                                </RawText>
                                <RawText fontSize='sm' fontWeight='medium' color={ltvStatusColor}>
                                  {currentLtvPercent}%{' '}
                                  <RawText as='span' color='text.subtle' fontWeight='normal'>
                                    {ltvZoneLabel}
                                  </RawText>
                                </RawText>
                              </Flex>
                              <LtvGauge currentLtv={currentLtvDecimal} />
                            </Box>
                            <Flex justify='flex-end'>
                              <Tooltip
                                label={liquidateTooltipLabel}
                                isDisabled={!liquidateTooltipLabel}
                                shouldWrapChildren
                                hasArrow
                              >
                                <Button
                                  variant='link'
                                  size='sm'
                                  colorScheme='red'
                                  fontWeight='normal'
                                  onClick={() =>
                                    handleVoluntaryLiquidation(
                                      isVoluntaryLiquidationActive ? 'stop' : 'initiate',
                                    )
                                  }
                                  isDisabled={isSafeModeStatusesLoading || !canLiquidate}
                                >
                                  {translate('chainflipLending.pool.cantRepay')}{' '}
                                  {translate('chainflipLending.pool.startLiquidation')} →
                                </Button>
                              </Tooltip>
                            </Flex>
                          </VStack>
                        )}

                        {/* Inline free balance row */}
                        <Divider />
                        <Flex justifyContent='space-between' alignItems='center'>
                          <RawText fontSize='sm' color='text.subtle'>
                            {translate('chainflipLending.pool.freeBalance')}
                          </RawText>
                          <VStack spacing={0} align='flex-end'>
                            {freeBalanceFiat !== undefined && (
                              <Amount.Fiat
                                value={freeBalanceFiat}
                                fontSize='sm'
                                fontWeight='medium'
                              />
                            )}
                            <Amount.Crypto
                              value={freeBalanceCryptoPrecision}
                              symbol={asset.symbol}
                              fontSize='xs'
                              color='text.subtle'
                            />
                          </VStack>
                        </Flex>
                        <HStack spacing={3}>
                          <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                            <Tooltip
                              label={depositTooltipLabel}
                              isDisabled={!depositTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-borrow-deposit-funds'
                                colorScheme='blue'
                                size='md'
                                borderRadius='xl'
                                width='full'
                                fontWeight='semibold'
                                onClick={handleDeposit}
                                isDisabled={
                                  isSafeModeStatusesLoading || !canDepositToChainflip || !accountId
                                }
                              >
                                + {translate('chainflipLending.depositToChainflip')}
                              </Button>
                            </Tooltip>
                          </Box>
                          <Box flex={1} sx={{ '> span': { display: 'block' } }}>
                            <Tooltip
                              label={withdrawFromChainflipTooltipLabel}
                              isDisabled={!withdrawFromChainflipTooltipLabel}
                              shouldWrapChildren
                              hasArrow
                            >
                              <Button
                                data-testid='chainflip-tab-borrow-egress-funds'
                                variant='outline'
                                colorScheme='blue'
                                size='md'
                                borderRadius='xl'
                                width='full'
                                fontWeight='semibold'
                                onClick={handleWithdrawFromChainflip}
                                isDisabled={
                                  isSafeModeStatusesLoading ||
                                  !canWithdrawFromChainflip ||
                                  !hasFreeBalance ||
                                  !accountId
                                }
                              >
                                {translate('common.withdraw')}
                              </Button>
                            </Tooltip>
                          </Box>
                        </HStack>
                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </CardBody>
            </Card>
          )}

          {/* Voluntary liquidation active card */}
          {hasLoans && accountId && isVoluntaryLiquidationActive && (
            <Card borderColor='red.500' borderWidth={1}>
              <CardBody p={4}>
                <VStack spacing={3} align='stretch'>
                  <RawText fontSize='xs' color='red.500' fontWeight='bold'>
                    {translate('chainflipLending.voluntaryLiquidation.inProgress')}
                  </RawText>
                  <Tooltip
                    label={liquidateTooltipLabel}
                    isDisabled={!liquidateTooltipLabel}
                    shouldWrapChildren
                    hasArrow
                  >
                    <Button
                      data-testid='chainflip-open-voluntary-liquidation'
                      colorScheme='yellow'
                      variant='solid'
                      size='md'
                      borderRadius='xl'
                      width='full'
                      fontWeight='bold'
                      onClick={() => handleVoluntaryLiquidation('stop')}
                      isDisabled={isSafeModeStatusesLoading || !canLiquidate}
                    >
                      {translate('chainflipLending.voluntaryLiquidation.confirmStop')}
                    </Button>
                  </Tooltip>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Next steps guidance card */}
          <NextStepsCard assetId={poolAssetId} />
        </Stack>
      </Flex>
    </Main>
  )
}
