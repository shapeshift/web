import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  TabPanel,
  TabPanels,
  Tabs,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import type { Property } from 'csstype'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { Borrow } from './components/Borrow/Borrow'
import { Collateral } from './components/Borrow/Collateral'
import { Repay } from './components/Borrow/Repay'

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
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { selectPortfolioCryptoBalanceByFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }
const actionColumnMaxWidth = { base: '100%', lg: '500px' }

enum PoolTabIndex {
  Supply = 0,
  Deposit = 1,
  Collateral = 2,
  Borrow = 3,
  Repay = 4,
}

const SUPPLY_TAB_ITEMS = [
  { label: 'chainflipLending.supply.title', index: PoolTabIndex.Supply },
  { label: 'chainflipLending.depositToChainflip', index: PoolTabIndex.Deposit },
]

const BORROW_TAB_ITEMS = [
  { label: 'chainflipLending.collateral.title', index: PoolTabIndex.Collateral },
  { label: 'chainflipLending.borrow.title', index: PoolTabIndex.Borrow },
  { label: 'chainflipLending.repay.title', index: PoolTabIndex.Repay },
]

type PoolHeaderProps = {
  assetId: AssetId
}

const PoolHeader: React.FC<PoolHeaderProps> = ({ assetId }) => {
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
    {tooltip ? (
      <Tooltip label={tooltip} hasArrow placement='top'>
        <RawText
          fontSize='xs'
          color='text.subtle'
          textTransform='uppercase'
          mb={1}
          cursor='help'
          borderBottomWidth={1}
          borderBottomStyle='dashed'
          borderBottomColor='text.subtle'
          display='inline-block'
        >
          {label}
        </RawText>
      </Tooltip>
    ) : (
      <RawText fontSize='xs' color='text.subtle' textTransform='uppercase' mb={1}>
        {label}
      </RawText>
    )}
    <Skeleton isLoaded={!isLoading}>{children}</Skeleton>
  </Box>
)

export const Pool = () => {
  const translate = useTranslate()
  const location = useLocation()
  const { dispatch: walletDispatch } = useWallet()
  const { accountId, accountNumber, setAccountId } = useChainflipLendingAccount()
  const [supplyTabIndex, setSupplyTabIndex] = useState(PoolTabIndex.Supply)
  const [borrowTabIndex, setBorrowTabIndex] = useState(PoolTabIndex.Collateral)
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
    collateralWithFiat,
    loansWithFiat,
    totalCollateralFiat,
    totalBorrowedFiat: userBorrowedFiat,
    isLoading: isLoanLoading,
  } = useChainflipLoanAccount()
  const { freeBalances } = useChainflipAccount()

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const chainId = useMemo(() => {
    try {
      return fromAssetId(poolAssetId).chainId
    } catch {
      return undefined
    }
  }, [poolAssetId])

  const poolChainAccountId = useMemo(() => {
    if (!chainId) return undefined
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const balanceFilter = useMemo(
    () => ({ assetId: poolAssetId, accountId: poolChainAccountId ?? '' }),
    [poolAssetId, poolChainAccountId],
  )
  const walletBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  ).toBaseUnit()

  const walletBalanceCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: walletBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [walletBalanceCryptoBaseUnit, asset?.precision],
  )

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

  const hasSupplyPosition = useMemo(
    () => bnOrZero(supplyPosition?.totalAmountCryptoPrecision).gt(0),
    [supplyPosition],
  )

  const headerComponent = useMemo(() => <PoolHeader assetId={poolAssetId} />, [poolAssetId])

  const supplyTabHeader = useMemo(
    () => (
      <FormHeader
        items={SUPPLY_TAB_ITEMS}
        setStepIndex={setSupplyTabIndex}
        activeIndex={supplyTabIndex}
      />
    ),
    [supplyTabIndex],
  )

  const borrowTabHeader = useMemo(
    () => (
      <FormHeader
        items={BORROW_TAB_ITEMS}
        setStepIndex={setBorrowTabIndex}
        activeIndex={borrowTabIndex}
      />
    ),
    [borrowTabIndex],
  )

  const poolCollateral = useMemo(
    () => collateralWithFiat.find(c => c.assetId === poolAssetId),
    [collateralWithFiat, poolAssetId],
  )

  const firstLoan = useMemo(() => loansWithFiat[0], [loansWithFiat])

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

  if (!asset) return null

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={`${asset.name} - Chainflip Lending`} />
      <Flex gap={6} flexDir={flexDirPool}>
        <Stack gap={4} flex={1}>
          <Card>
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
                    fontSize='sm'
                    fontWeight='bold'
                  />
                  <Amount.Crypto
                    value={poolData?.totalAmountCryptoPrecision ?? '0'}
                    symbol={asset.symbol}
                    fontSize='xs'
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
                    fontSize='sm'
                    fontWeight='bold'
                    autoColor
                  />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.availableLiquidity')}
                  tooltip={translate('chainflipLending.availableLiquidityTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Fiat
                    value={poolData?.availableAmountFiat ?? '0'}
                    fontSize='sm'
                    fontWeight='bold'
                  />
                </StatBox>
              </SimpleGrid>
            </CardBody>
          </Card>

          <Card>
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
                  <Amount.Fiat value={totalBorrowedFiat} fontSize='sm' fontWeight='bold' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.borrowRate')}
                  tooltip={translate('chainflipLending.borrowRateTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent
                    value={poolData?.borrowRate ?? '0'}
                    fontSize='sm'
                    fontWeight='bold'
                  />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.utilisation')}
                  tooltip={translate('chainflipLending.utilisationTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent value={utilisationPercent} fontSize='sm' fontWeight='bold' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.originationFee')}
                  tooltip={translate('chainflipLending.originationFeeTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent value={originationFee} fontSize='sm' fontWeight='bold' />
                </StatBox>
                <StatBox
                  label={translate('chainflipLending.liquidationFee')}
                  tooltip={translate('chainflipLending.liquidationFeeTooltip')}
                  isLoading={isLoading}
                >
                  <Amount.Percent value={liquidationFee} fontSize='sm' fontWeight='bold' />
                </StatBox>
              </SimpleGrid>
            </CardBody>
          </Card>
        </Stack>

        <Stack
          maxW={actionColumnMaxWidth}
          w='full'
          position='sticky'
          top={4}
          alignSelf='flex-start'
          gap={4}
        >
          <Card>
            <CardBody p={{ base: 4, md: 5 }}>
              <Flex justifyContent='space-between' alignItems='center' mb={4}>
                <Heading
                  as='h3'
                  size='sm'
                  textTransform='uppercase'
                  color='text.subtle'
                  letterSpacing='wider'
                >
                  {translate('chainflipLending.yourPosition')}
                </Heading>
                {accountId ? (
                  <AccountDropdown
                    assetId={ethAssetId}
                    onChange={setAccountId}
                    defaultAccountId={accountId}
                    autoSelectHighestBalance
                    buttonProps={{ variant: 'ghost', size: 'sm' }}
                  />
                ) : null}
              </Flex>
              <VStack spacing={4} align='stretch'>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <RawText fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                      {translate('chainflipLending.supplied')}
                    </RawText>
                    <Skeleton isLoaded={!isPositionsLoading}>
                      <Amount.Fiat
                        value={supplyPosition?.totalAmountFiat ?? '0'}
                        fontSize='lg'
                        fontWeight='bold'
                      />
                    </Skeleton>
                    {accountId ? (
                      <Skeleton isLoaded={!isPositionsLoading}>
                        <Amount.Crypto
                          value={supplyPosition?.totalAmountCryptoPrecision ?? '0'}
                          symbol={asset.symbol}
                          fontSize='xs'
                          color='text.subtle'
                        />
                      </Skeleton>
                    ) : null}
                  </Box>
                  <Box>
                    <RawText fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                      {translate('chainflipLending.collateral.title')}
                    </RawText>
                    <Skeleton isLoaded={!isLoanLoading}>
                      <Amount.Fiat value={totalCollateralFiat} fontSize='lg' fontWeight='bold' />
                    </Skeleton>
                    {accountId ? (
                      <Skeleton isLoaded={!isLoanLoading}>
                        <Amount.Crypto
                          value={poolCollateral?.amountCryptoPrecision ?? '0'}
                          symbol={asset.symbol}
                          fontSize='xs'
                          color='text.subtle'
                        />
                      </Skeleton>
                    ) : null}
                  </Box>
                </SimpleGrid>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <RawText fontSize='xs' color='text.subtle' mb={1} textTransform='uppercase'>
                      {translate('chainflipLending.borrow.borrowed')}
                    </RawText>
                    <Skeleton isLoaded={!isLoanLoading}>
                      <Amount.Fiat value={userBorrowedFiat} fontSize='lg' fontWeight='bold' />
                    </Skeleton>
                  </Box>
                </SimpleGrid>
                {!accountId ? (
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
                ) : null}
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody px={0} py={0}>
              <Tabs index={supplyTabIndex}>
                {supplyTabHeader}
                <TabPanels>
                  <TabPanel p={4}>
                    <VStack spacing={3} align='stretch'>
                      <Flex justifyContent='space-between' alignItems='center'>
                        <RawText fontSize='sm' color='text.subtle'>
                          {translate('chainflipLending.pool.freeBalance')}
                        </RawText>
                        <Amount.Crypto
                          value={freeBalanceCryptoPrecision}
                          symbol={asset.symbol}
                          fontSize='sm'
                          fontWeight='medium'
                        />
                      </Flex>
                      <Flex justifyContent='space-between' alignItems='center'>
                        <RawText fontSize='sm' color='text.subtle'>
                          {translate('chainflipLending.supplied')}
                        </RawText>
                        <Skeleton isLoaded={!isPositionsLoading}>
                          <Amount.Crypto
                            value={supplyPosition?.totalAmountCryptoPrecision ?? '0'}
                            symbol={asset.symbol}
                            fontSize='sm'
                            fontWeight='medium'
                          />
                        </Skeleton>
                      </Flex>
                      <HStack spacing={3}>
                        <Tooltip
                          label={translate('chainflipLending.pool.noFreeBalance')}
                          isDisabled={hasFreeBalance}
                          shouldWrapChildren
                          hasArrow
                        >
                          <Button
                            colorScheme='blue'
                            size='lg'
                            height={12}
                            borderRadius='xl'
                            flex={1}
                            fontWeight='bold'
                            onClick={handleSupply}
                            isDisabled={!hasFreeBalance || !accountId}
                          >
                            {translate('chainflipLending.pool.supply')}
                          </Button>
                        </Tooltip>
                        <Tooltip
                          label={translate('chainflipLending.pool.noSupplyPosition')}
                          isDisabled={hasSupplyPosition}
                          shouldWrapChildren
                          hasArrow
                        >
                          <Button
                            variant='outline'
                            colorScheme='blue'
                            size='lg'
                            height={12}
                            borderRadius='xl'
                            flex={1}
                            fontWeight='bold'
                            onClick={handleWithdrawSupply}
                            isDisabled={!hasSupplyPosition || !accountId}
                          >
                            {translate('common.withdraw')}
                          </Button>
                        </Tooltip>
                      </HStack>
                    </VStack>
                  </TabPanel>
                  <TabPanel p={4}>
                    <VStack spacing={3} align='stretch'>
                      <Flex justifyContent='space-between' alignItems='center'>
                        <RawText fontSize='sm' color='text.subtle'>
                          {translate('chainflipLending.pool.freeBalance')}
                        </RawText>
                        <Amount.Crypto
                          value={freeBalanceCryptoPrecision}
                          symbol={asset.symbol}
                          fontSize='sm'
                          fontWeight='medium'
                        />
                      </Flex>
                      <Flex justifyContent='space-between' alignItems='center'>
                        <RawText fontSize='sm' color='text.subtle'>
                          {translate('chainflipLending.pool.walletBalance')}
                        </RawText>
                        <Amount.Crypto
                          value={walletBalanceCryptoPrecision}
                          symbol={asset.symbol}
                          fontSize='sm'
                          fontWeight='medium'
                        />
                      </Flex>
                      <HStack spacing={3}>
                        <Button
                          colorScheme='blue'
                          size='lg'
                          height={12}
                          borderRadius='xl'
                          flex={1}
                          fontWeight='bold'
                          onClick={handleDeposit}
                          isDisabled={!accountId}
                        >
                          {translate('chainflipLending.pool.depositToChainflip')}
                        </Button>
                        <Tooltip
                          label={translate('chainflipLending.pool.noFreeBalance')}
                          isDisabled={hasFreeBalance}
                          shouldWrapChildren
                          hasArrow
                        >
                          <Button
                            variant='outline'
                            colorScheme='blue'
                            size='lg'
                            height={12}
                            borderRadius='xl'
                            flex={1}
                            fontWeight='bold'
                            onClick={handleWithdrawFromChainflip}
                            isDisabled={!hasFreeBalance || !accountId}
                          >
                            {translate('common.withdraw')}
                          </Button>
                        </Tooltip>
                      </HStack>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>

          <Card>
            <CardBody px={0} py={0}>
              <Tabs index={borrowTabIndex - PoolTabIndex.Collateral}>
                {borrowTabHeader}
                <TabPanels>
                  <TabPanel p={0}>
                    <Collateral assetId={poolAssetId} mode='add' />
                  </TabPanel>
                  <TabPanel p={0}>
                    <Borrow assetId={poolAssetId} />
                  </TabPanel>
                  <TabPanel p={0}>
                    {firstLoan ? (
                      <Repay assetId={poolAssetId} loanId={firstLoan.loanId} />
                    ) : (
                      <Box p={6} textAlign='center'>
                        <RawText color='text.subtle'>
                          {translate('chainflipLending.borrow.noCollateral')}
                        </RawText>
                      </Box>
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}
