import type { GridProps } from '@chakra-ui/react'
import { Button, Center, Flex, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { ChainflipLendingHeader } from '@/pages/ChainflipLending/components/ChainflipLendingHeader'
import type { ChainflipFreeBalanceWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import { useChainflipFreeBalances } from '@/pages/ChainflipLending/hooks/useChainflipFreeBalances'
import type { ChainflipSupplyPositionWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoBalanceByFilter } from '@/state/slices/common-selectors'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

const balanceRowGrid: GridProps['gridTemplateColumns'] = {
  base: '1fr',
  md: '200px 1fr 1fr 1fr',
}

const mobileDisplay = { base: 'none', md: 'flex' }
const mobilePadding = { base: 4, lg: 4, xl: 0 }
const listMargin = { base: 0, lg: 0, xl: -4 }

const LENDING_ASSET_IDS = Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[]

type BalanceRowProps = {
  assetId: AssetId
  accountNumber: number
  freeBalance: ChainflipFreeBalanceWithFiat | undefined
  supplyPosition: ChainflipSupplyPositionWithFiat | undefined
  onDeposit: (assetId: AssetId) => void
}

const BalanceRow = ({
  assetId,
  accountNumber,
  freeBalance,
  supplyPosition,
  onDeposit,
}: BalanceRowProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const chainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])

  const poolChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const balanceFilter = useMemo(
    () => ({ assetId, accountId: poolChainAccountId ?? '' }),
    [assetId, poolChainAccountId],
  )

  const walletBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  )

  const walletBalancePrecision = useMemo(
    () => (poolChainAccountId ? walletBalance.toPrecision() : '0'),
    [walletBalance, poolChainAccountId],
  )

  const scBalancePrecision = useMemo(
    () => freeBalance?.balanceCryptoPrecision ?? '0',
    [freeBalance?.balanceCryptoPrecision],
  )

  const suppliedPrecision = useMemo(
    () => supplyPosition?.totalAmountCryptoPrecision ?? '0',
    [supplyPosition?.totalAmountCryptoPrecision],
  )

  const handleClick = useCallback(() => {
    onDeposit(assetId)
  }, [assetId, onDeposit])

  const symbol = useMemo(() => asset?.symbol ?? '', [asset?.symbol])

  if (!asset) return null

  return (
    <Button
      variant='ghost'
      display='grid'
      gridTemplateColumns={balanceRowGrid}
      columnGap={4}
      alignItems='center'
      textAlign='left'
      py={4}
      width='full'
      height='auto'
      color='text.base'
      onClick={handleClick}
    >
      <AssetCell assetId={assetId} />
      <Flex display={mobileDisplay}>
        <Amount.Crypto value={walletBalancePrecision} symbol={symbol} />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Crypto value={scBalancePrecision} symbol={symbol} />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Crypto value={suppliedPrecision} symbol={symbol} />
      </Flex>
    </Button>
  )
}

export const MyBalances = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { dispatch: walletDispatch } = useWallet()
  const { accountId, accountNumber } = useChainflipLendingAccount()
  const { freeBalances, isLoading } = useChainflipFreeBalances()
  const { supplyPositions, isLoading: isPositionsLoading } = useChainflipSupplyPositions()

  const handleDeposit = useCallback(
    (assetId: AssetId) => {
      navigate(`/chainflip-lending/pool/${assetId}`)
    },
    [navigate],
  )

  const handleConnectWallet = useCallback(
    () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [walletDispatch],
  )

  const headerComponent = useMemo(() => <ChainflipLendingHeader />, [])

  const freeBalancesByAssetId = useMemo(
    () =>
      freeBalances.reduce<Partial<Record<AssetId, ChainflipFreeBalanceWithFiat>>>(
        (acc, balance) => {
          if (balance.assetId) acc[balance.assetId] = balance
          return acc
        },
        {},
      ),
    [freeBalances],
  )

  const supplyPositionsByAssetId = useMemo(
    () =>
      supplyPositions.reduce<Partial<Record<AssetId, ChainflipSupplyPositionWithFiat>>>(
        (acc, position) => {
          acc[position.assetId] = position
          return acc
        },
        {},
      ),
    [supplyPositions],
  )

  const balanceRows = useMemo(() => {
    if (!accountId) {
      return (
        <Center flexDir='column' gap={4} py={12}>
          <Text color='text.subtle' translation='chainflipLending.connectToViewBalances' />
          <Button colorScheme='blue' onClick={handleConnectWallet}>
            {translate('common.connectWallet')}
          </Button>
        </Center>
      )
    }

    if (isLoading || isPositionsLoading) {
      return Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={16} />)
    }

    return LENDING_ASSET_IDS.map(assetId => (
      <BalanceRow
        key={assetId}
        assetId={assetId}
        accountNumber={accountNumber}
        freeBalance={freeBalancesByAssetId[assetId]}
        supplyPosition={supplyPositionsByAssetId[assetId]}
        onDeposit={handleDeposit}
      />
    ))
  }, [
    accountId,
    accountNumber,
    isLoading,
    isPositionsLoading,
    freeBalancesByAssetId,
    supplyPositionsByAssetId,
    handleDeposit,
    handleConnectWallet,
    translate,
  ])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('chainflipLending.myBalancesTitle')} />
      <Stack>
        <SimpleGrid
          gridTemplateColumns={balanceRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='chainflipLending.market' />
          <Flex display={mobileDisplay}>
            <Text translation='chainflipLending.walletBalance' />
          </Flex>
          <Flex display={mobileDisplay}>
            <Text translation='chainflipLending.stateChainBalance' />
          </Flex>
          <Flex display={mobileDisplay}>
            <Text translation='chainflipLending.suppliedBalance' />
          </Flex>
        </SimpleGrid>
        <Stack mx={listMargin}>{balanceRows}</Stack>
      </Stack>
    </Main>
  )
}
