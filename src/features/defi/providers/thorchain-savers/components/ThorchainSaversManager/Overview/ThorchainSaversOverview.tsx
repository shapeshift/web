import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Center,
  Flex,
  Link,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { skipToken, useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaTwitter } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { ThorchainSaversEmpty } from './ThorchainSaversEmpty'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Text } from '@/components/Text'
import type { DefiButtonProps } from '@/features/defi/components/DefiActionButtons'
import { Overview } from '@/features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { getThorchainFromAddress } from '@/lib/utils/thorchain'
import { useGetThorchainSaversDepositQuoteQuery } from '@/lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import { formatSecondsToDuration } from '@/lib/utils/time'
import { useIsLendingActive } from '@/pages/Lending/hooks/useIsLendingActive'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'
import type { ThorchainSaversStakingSpecificMetadata } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import {
  getThorchainSaversPosition,
  THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT,
} from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import type { StakingId } from '@/state/slices/opportunitiesSlice/types'
import { DefiProvider, DefiType } from '@/state/slices/opportunitiesSlice/types'
import {
  isSaversUserStakingOpportunity,
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  toOpportunityId,
} from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectOpportunitiesApiQueriesByFilter,
  selectPortfolioAccountMetadataByAccountId,
  selectStakingOpportunityByFilter,
  selectTxsByFilter,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type OverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

const faTwitterIcon = <FaTwitter />

export const ThorchainSaversOverview: React.FC<OverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [hideEmptyState, setHideEmptyState] = useState(false)
  const { chainId, assetReference, assetNamespace } = query
  const alertBg = useColorModeValue('gray.200', 'gray.900')

  const {
    state: { wallet },
  } = useWallet()

  const { isLendingActive, isMimirLoading } = useIsLendingActive()

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const isRunePool = assetId === thorchainAssetId

  const { isLoading: isMockDepositQuoteLoading, error } = useGetThorchainSaversDepositQuoteQuery({
    asset,
    amountCryptoBaseUnit: BigNumber.max(
      THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
      toBaseUnit(1, asset?.precision ?? 0),
    ),
    enabled: !isRunePool,
  })

  const isHardCapReached = useMemo(
    () => (error ? error.message.includes('add liquidity rune is more than bond') : false),
    [error],
  )

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestStakingBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestStakingBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestStakingBalanceAccountId],
  )

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const isThorchainSaversDepositEnabled = useFeatureFlag('SaversVaultsDeposit')
  const isThorchainSaversWithdrawalsEnabled = useFeatureFlag('SaversVaultsWithdraw')

  const isRunePoolDepositEnabled = useFeatureFlag('RunePoolDeposit')
  const isRunepoolWithdrawEnabled = useFeatureFlag('RunePoolWithdraw')

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    if (maybeAccountId === undefined || maybeAccountId.length === 0) return

    return {
      userStakingId: serializeUserStakingId(
        maybeAccountId,
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference,
        }),
      ),
    }
  }, [assetNamespace, assetReference, chainId, maybeAccountId])

  const earnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const opportunityMetadataFilter = useMemo(() => ({ stakingId: assetId as StakingId }), [assetId])
  const opportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  ) as ThorchainSaversStakingSpecificMetadata

  const currentCapFillPercentage = bnOrZero(opportunityMetadata?.tvl)
    .div(bnOrZero(opportunityMetadata?.saversMaxSupplyFiat))
    .times(100)
    .toNumber()

  const underlyingAssetsFiatBalanceCryptoPrecision = useMemo(() => {
    if (!asset || !earnOpportunityData?.underlyingAssetId) return '0'

    const cryptoAmount = fromBaseUnit(
      earnOpportunityData?.stakedAmountCryptoBaseUnit ?? '0',
      asset.precision,
    )
    const price = marketData?.price
    return bnOrZero(cryptoAmount).times(bnOrZero(price)).toString()
  }, [
    asset,
    marketData,
    earnOpportunityData?.stakedAmountCryptoBaseUnit,
    earnOpportunityData?.underlyingAssetId,
  ])

  const underlyingAssetId = useMemo(
    () => earnOpportunityData?.underlyingAssetIds?.[0],
    [earnOpportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useMemo(
    () => assets[underlyingAssetId ?? ''],
    [assets, underlyingAssetId],
  )
  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    opportunityDataFilter
      ? selectUnderlyingStakingAssetsWithBalancesAndIcons(state, opportunityDataFilter)
      : undefined,
  )

  const hasPendingTxsFilter = useMemo(
    () => ({
      accountId,
      assetId,
    }),
    [accountId, assetId],
  )
  const hasPendingTxs = useAppSelector(state => selectTxsByFilter(state, hasPendingTxsFilter)).some(
    tx => tx.status === TxStatus.Pending,
  )

  const pendingQueriesFilter = useMemo(
    () => ({
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
      queryStatus: QueryStatus.pending,
    }),
    [],
  )
  const hasPendingQueries = Boolean(
    useAppSelector(state => selectOpportunitiesApiQueriesByFilter(state, pendingQueriesFilter))
      .length,
  )

  const remainingLockupTime = useMemo(() => {
    if (!isSaversUserStakingOpportunity(earnOpportunityData)) return 0
    return Math.max(earnOpportunityData.dateUnlocked - Math.floor(Date.now() / 1000), 0)
  }, [earnOpportunityData])

  const accountFilter = useMemo(() => ({ accountId: maybeAccountId }), [maybeAccountId])

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['thorchainFromAddress', accountId, assetId, opportunityId],
    queryFn:
      accountId && wallet && accountMetadata
        ? () =>
            getThorchainFromAddress({
              accountId,
              assetId,
              opportunityId,
              getPosition: getThorchainSaversPosition,
              accountMetadata,
              wallet,
            })
        : skipToken,
  })

  const makeDefaultMenu = useCallback(
    ({
      isFull,
      hasPendingTxs,
      hasPendingQueries,
      isHaltedDeposits,
      isDisabledDeposits,
      isDisabledWithdrawals,
      remainingLockupTime,
    }: {
      isFull?: boolean
      hasPendingTxs?: boolean
      hasPendingQueries?: boolean
      isHaltedDeposits?: boolean
      isDisabledDeposits?: boolean
      isDisabledWithdrawals?: boolean
      remainingLockupTime?: number
    } = {}): DefiButtonProps[] => [
      ...(isFull
        ? []
        : [
            {
              label: 'common.deposit',
              icon: <ArrowUpIcon />,
              action: DefiAction.Deposit,
              isDisabled:
                isFull ||
                hasPendingTxs ||
                hasPendingQueries ||
                isHaltedDeposits ||
                isDisabledDeposits,
              toolTip: (() => {
                if (isDisabledDeposits)
                  return translate('defi.modals.saversVaults.disabledDepositTitle')
                if (isHaltedDeposits)
                  return translate('defi.modals.saversVaults.haltedDepositTitle')
                if (hasPendingTxs || hasPendingQueries)
                  return translate('defi.modals.saversVaults.cannotDepositWhilePendingTx')
              })(),
            },
          ]),
      {
        label: 'common.withdraw',
        icon: <ArrowDownIcon />,
        action: DefiAction.Withdraw,
        isDisabled:
          hasPendingTxs ||
          hasPendingQueries ||
          isDisabledWithdrawals ||
          Boolean(remainingLockupTime),
        toolTip: (() => {
          if (isDisabledWithdrawals) {
            return translate('defi.modals.saversVaults.disabledWithdrawTitle')
          }

          if (remainingLockupTime !== undefined && remainingLockupTime > 0) {
            return translate('defi.modals.saversVaults.withdrawLockedTitle', {
              timeHuman: formatSecondsToDuration(remainingLockupTime),
            })
          }

          if (hasPendingTxs || hasPendingQueries) {
            return translate('defi.modals.saversVaults.cannotWithdrawWhilePendingTx')
          }
        })(),
      },
    ],
    [translate],
  )

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!earnOpportunityData) return []

    return makeDefaultMenu({
      isFull: opportunityMetadata?.isFull || isHardCapReached,
      hasPendingTxs,
      hasPendingQueries,
      isHaltedDeposits: isTradingActive === false,
      isDisabledDeposits:
        (!isRunePool && isThorchainSaversDepositEnabled === false) ||
        (isRunePool && !isRunePoolDepositEnabled),
      isDisabledWithdrawals:
        (!isRunePool && isThorchainSaversWithdrawalsEnabled === false) ||
        (isRunePool && !isRunepoolWithdrawEnabled),
      remainingLockupTime,
    })
  }, [
    earnOpportunityData,
    hasPendingQueries,
    hasPendingTxs,
    isHardCapReached,
    isRunePool,
    isRunePoolDepositEnabled,
    isRunepoolWithdrawEnabled,
    isThorchainSaversDepositEnabled,
    isThorchainSaversWithdrawalsEnabled,
    isTradingActive,
    makeDefaultMenu,
    opportunityMetadata?.isFull,
    remainingLockupTime,
  ])

  const poolAlert = useMemo(() => {
    if (!isLendingActive && !isRunePool && !isMimirLoading) {
      return (
        <Alert status='warning' variant='subtle'>
          <AlertIcon />
          <AlertDescription>{translate('lending.haltedAlert')}</AlertDescription>
        </Alert>
      )
    }

    if (isHardCapReached || bnOrZero(currentCapFillPercentage).eq(100)) {
      return (
        <Alert status='warning' flexDir='column' bg={alertBg} py={4}>
          <AlertIcon />
          <AlertTitle>{translate('defi.modals.saversVaults.haltedDepositTitle')}</AlertTitle>
          <>
            <AlertDescription>
              {translate('defi.modals.saversVaults.haltedDescription')}
            </AlertDescription>
            <Button
              as={Link}
              href={`https://twitter.com/intent/tweet?text=Hey%20%40THORChain%20%23raisethecaps%20already%20so%20I%20can%20deposit%20%23${underlyingAsset?.symbol}%20into%20a%20savers%20vault%20at%20%40ShapeShift`}
              isExternal
              mt={4}
              colorScheme='twitter'
              rightIcon={faTwitterIcon}
            >
              @THORChain
            </Button>
          </>
        </Alert>
      )
    }

    return (
      <Progress
        value={currentCapFillPercentage}
        size='sm'
        borderRadius='md'
        colorScheme={bnOrZero(currentCapFillPercentage).lt(100) ? 'green' : 'red'}
      />
    )
  }, [
    translate,
    alertBg,
    underlyingAsset?.symbol,
    currentCapFillPercentage,
    isHardCapReached,
    isRunePool,
    isLendingActive,
    isMimirLoading,
  ])

  const renderVaultCap = useMemo(() => {
    return (
      <Flex direction='column' gap={2}>
        <Flex justifyContent='space-between' alignItems='center'>
          <HelperTooltip label={translate('defi.modals.saversVaults.vaultCapTooltip')}>
            <Text fontWeight='medium' translation='defi.modals.saversVaults.vaultCap' />
          </HelperTooltip>
          <Flex gap={1}>
            <Amount.Fiat value={opportunityMetadata?.tvl ?? 0} />
            {opportunityMetadata?.saversMaxSupplyFiat !== undefined ? (
              <Amount.Fiat
                value={opportunityMetadata.saversMaxSupplyFiat ?? 0}
                prefix='/'
                color='text.subtle'
              />
            ) : null}
          </Flex>
        </Flex>

        {poolAlert}
      </Flex>
    )
  }, [opportunityMetadata?.saversMaxSupplyFiat, opportunityMetadata?.tvl, translate, poolAlert])

  const description = useMemo(
    () => ({
      description: translate(
        isRunePool
          ? 'defi.modals.saversVaults.runePoolOverviewDescription'
          : 'defi.modals.saversVaults.description',
        {
          asset: underlyingAsset?.symbol ?? '',
        },
      ),
      isLoaded: isRunePool || !!underlyingAsset?.symbol,
      isTrustedDescription: true,
    }),
    [translate, underlyingAsset?.symbol, isRunePool],
  )

  const handleThorchainSaversEmptyClick = useCallback(() => setHideEmptyState(true), [])

  if (!earnOpportunityData?.isLoaded || isTradingActiveLoading || isMockDepositQuoteLoading) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (bnOrZero(underlyingAssetsFiatBalanceCryptoPrecision).eq(0) && !hideEmptyState) {
    return <ThorchainSaversEmpty assetId={assetId} onClick={handleThorchainSaversEmptyClick} />
  }

  if (!asset) return null
  if (!underlyingAssetsWithBalancesAndIcons) return null
  if (!earnOpportunityData) return null

  return (
    <Overview
      accountId={maybeAccountId}
      onAccountIdChange={handleAccountIdChange}
      positionAddress={fromAddress}
      asset={asset}
      name={earnOpportunityData.name ?? ''}
      opportunityFiatBalance={underlyingAssetsFiatBalanceCryptoPrecision}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: earnOpportunityData.provider,
        assetName: asset.name,
      })}
      description={description}
      tvl={bnOrZero(earnOpportunityData.tvl).toFixed(2)}
      apy={earnOpportunityData.apy}
      menu={menu}
      postChildren={
        bnOrZero(opportunityMetadata?.saversMaxSupplyFiat).gt(0) ? renderVaultCap : null
      }
    />
  )
}
