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
import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'
import type { DefiButtonProps } from 'features/defi/components/DefiActionButtons'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaTwitter } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { useGetThorchainSaversDepositQuoteQuery } from 'lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import type { ThorchainSaversStakingSpecificMetadata } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import { THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import {
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  toOpportunityId,
} from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectHighestUserCurrencyBalanceAccountByAssetId,
  selectMarketDataByAssetIdUserCurrency,
  selectOpportunitiesApiQueriesByFilter,
  selectStakingOpportunityByFilter,
  selectTxsByFilter,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversEmpty } from './ThorchainSaversEmpty'

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

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const { isLoading: isMockDepositQuoteLoading, error } = useGetThorchainSaversDepositQuoteQuery({
    asset,
    amountCryptoBaseUnit: BigNumber.max(
      THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
      toBaseUnit(1, asset?.precision ?? 0),
    ),
    enabled: assetId !== thorchainAssetId,
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

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    if (!maybeAccountId?.length) return

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

  const hasStakedBalance = useMemo(() => {
    return bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit).gt(0)
  }, [earnOpportunityData?.stakedAmountCryptoBaseUnit])

  const highestAssetBalanceFilter = useMemo(
    () => ({
      assetId,
    }),
    [assetId],
  )
  const highestAssetBalanceAccountId = useAppSelector(state =>
    selectHighestUserCurrencyBalanceAccountByAssetId(state, highestAssetBalanceFilter),
  )

  const highestStakedOrAssetBalanceAccountId = hasStakedBalance
    ? maybeAccountId
    : highestAssetBalanceAccountId

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
    const price = marketData.price
    return bnOrZero(cryptoAmount).times(price).toString()
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

  const makeDefaultMenu = useCallback(
    ({
      isFull,
      hasPendingTxs,
      hasPendingQueries,
      isHaltedDeposits,
      isDisabledDeposits,
      isDisabledWithdrawals,
    }: {
      isFull?: boolean
      hasPendingTxs?: boolean
      hasPendingQueries?: boolean
      isHaltedDeposits?: boolean
      isDisabledDeposits?: boolean
      isDisabledWithdrawals?: boolean
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
        isDisabled: hasPendingTxs || hasPendingQueries || isDisabledWithdrawals,
        toolTip: (() => {
          if (isDisabledWithdrawals)
            return translate('defi.modals.saversVaults.disabledWithdrawTitle')
          if (hasPendingTxs || hasPendingQueries)
            return translate('defi.modals.saversVaults.cannotWithdrawWhilePendingTx')
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
      isDisabledDeposits: isThorchainSaversDepositEnabled === false,
      isDisabledWithdrawals: isThorchainSaversWithdrawalsEnabled === false,
    })
  }, [
    earnOpportunityData,
    makeDefaultMenu,
    opportunityMetadata?.isFull,
    isHardCapReached,
    hasPendingTxs,
    hasPendingQueries,
    isTradingActive,
    isThorchainSaversDepositEnabled,
    isThorchainSaversWithdrawalsEnabled,
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
            <Amount.Fiat
              value={opportunityMetadata?.saversMaxSupplyFiat ?? 0}
              prefix='/'
              color='text.subtle'
            />
          </Flex>
        </Flex>
        {isHardCapReached || bnOrZero(currentCapFillPercentage).eq(100) ? (
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
        ) : (
          <Progress
            value={currentCapFillPercentage}
            size='sm'
            borderRadius='md'
            colorScheme={bnOrZero(currentCapFillPercentage).lt(100) ? 'green' : 'red'}
          />
        )}
      </Flex>
    )
  }, [
    alertBg,
    currentCapFillPercentage,
    isHardCapReached,
    opportunityMetadata?.saversMaxSupplyFiat,
    opportunityMetadata?.tvl,
    translate,
    underlyingAsset?.symbol,
  ])

  const description = useMemo(
    () => ({
      description: translate('defi.modals.saversVaults.description', {
        asset: underlyingAsset?.symbol ?? '',
      }),
      isLoaded: !!underlyingAsset?.symbol,
      isTrustedDescription: true,
    }),
    [translate, underlyingAsset?.symbol],
  )

  const handleThorchainSaversEmptyClick = useCallback(() => setHideEmptyState(true), [])
  // console.log({
  //   earnOpportunityData,
  //   highestStakedOrAssetBalanceAccountId,
  //   isTradingActiveLoading,
  //   isMockDepositQuoteLoading,
  // })

  if (
    (!earnOpportunityData?.isLoaded && highestStakedOrAssetBalanceAccountId) ||
    isTradingActiveLoading ||
    isMockDepositQuoteLoading
  ) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (bnOrZero(underlyingAssetsFiatBalanceCryptoPrecision).eq(0) && !hideEmptyState) {
    return <ThorchainSaversEmpty assetId={assetId} onClick={handleThorchainSaversEmptyClick} />
  }

  if (!(highestStakedOrAssetBalanceAccountId && opportunityDataFilter)) return null
  if (!asset) return null
  if (!underlyingAssetsWithBalancesAndIcons) return null
  if (!earnOpportunityData) return null

  return (
    <Overview
      accountId={highestStakedOrAssetBalanceAccountId}
      onAccountIdChange={handleAccountIdChange}
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
