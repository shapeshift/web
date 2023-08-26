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
import { toAssetId } from '@shapeshiftoss/caip'
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
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { SwapperName } from 'lib/swapper/api'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { selectSwapperApiTradingActivePending } from 'state/apis/swapper/selectors'
import type { ThorchainSaversStakingSpecificMetadata } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import {
  getMaybeThorchainSaversDepositQuote,
  THORCHAIN_SAVERS_DUST_THRESHOLDS,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
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
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectOpportunitiesApiQueriesByFilter,
  selectStakingOpportunityByFilter,
  selectTxsByFilter,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversEmpty } from './ThorchainSaversEmpty'

type OverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const ThorchainSaversOverview: React.FC<OverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [hideEmptyState, setHideEmptyState] = useState(false)
  const { chainId, assetReference, assetNamespace } = query
  const alertBg = useColorModeValue('gray.200', 'gray.900')
  const [isHalted, setIsHalted] = useState(false)
  const [isHardCapReached, setIsHardCapReached] = useState(false)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  useEffect(() => {
    ;(async () => {
      if (!(asset && assetId)) return

      const maybeQuote = await getMaybeThorchainSaversDepositQuote({
        asset,
        amountCryptoBaseUnit: BigNumber.max(
          THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId],
          bn(1).times(bn(10).pow(asset.precision)).toString(),
        ).toString(),
      })
      if (
        maybeQuote.isErr() &&
        maybeQuote.unwrapErr().includes('add liquidity rune is more than bond')
      )
        setIsHardCapReached(true)
    })()
  }, [asset, assetId])

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestBalanceAccountId],
  )

  useEffect(() => {
    ;(async () => {
      const { getIsTradingActive } = getIsTradingActiveApi.endpoints
      const { data: isTradingActive } = await appDispatch(
        getIsTradingActive.initiate({
          assetId,
          swapperName: SwapperName.Thorchain,
        }),
      )

      if (!isTradingActive) {
        setIsHalted(true)
      }
    })()
  }, [appDispatch, assetId])

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

    const cryptoAmount = bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit)
      .div(bn(10).pow(asset.precision))
      .toString()
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

  const isTradingActiveQueryPending = useAppSelector(selectSwapperApiTradingActivePending)

  const makeDefaultMenu = useCallback(
    ({
      isFull,
      hasPendingTxs,
      hasPendingQueries,
      isHalted,
    }: {
      isFull?: boolean
      hasPendingTxs?: boolean
      hasPendingQueries?: boolean
      isHalted?: boolean
    } = {}): DefiButtonProps[] => [
      ...(isFull
        ? []
        : [
            {
              label: 'common.deposit',
              icon: <ArrowUpIcon />,
              action: DefiAction.Deposit,
              isDisabled: isFull || hasPendingTxs || hasPendingQueries || isHalted,
              toolTip: (() => {
                if (hasPendingTxs || hasPendingQueries)
                  return translate('defi.modals.saversVaults.cannotDepositWhilePendingTx')
                if (isHalted) return translate('defi.modals.saversVaults.haltedTitle')
              })(),
            },
          ]),
      {
        label: 'common.withdraw',
        icon: <ArrowDownIcon />,
        action: DefiAction.Withdraw,
        isDisabled: hasPendingTxs || hasPendingQueries,
        toolTip:
          hasPendingTxs || hasPendingQueries
            ? translate('defi.modals.saversVaults.cannotWithdrawWhilePendingTx')
            : undefined,
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
      isHalted,
    })
  }, [
    earnOpportunityData,
    makeDefaultMenu,
    opportunityMetadata?.isFull,
    isHardCapReached,
    hasPendingTxs,
    hasPendingQueries,
    isHalted,
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
            <AlertTitle>{translate('defi.modals.saversVaults.haltedTitle')}</AlertTitle>
            {!isHardCapReached && (
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
                  rightIcon={<FaTwitter />}
                >
                  @THORChain
                </Button>
              </>
            )}
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

  if (!earnOpportunityData || isTradingActiveQueryPending) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (!(maybeAccountId && opportunityDataFilter)) return null
  if (!asset) return null
  if (!underlyingAssetsWithBalancesAndIcons || !earnOpportunityData) return null

  if (bnOrZero(underlyingAssetsFiatBalanceCryptoPrecision).eq(0) && !hideEmptyState) {
    return <ThorchainSaversEmpty assetId={assetId} onClick={() => setHideEmptyState(true)} />
  }

  return (
    <Overview
      accountId={maybeAccountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      name={earnOpportunityData.name ?? ''}
      opportunityFiatBalance={underlyingAssetsFiatBalanceCryptoPrecision}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: earnOpportunityData.provider,
        assetName: asset.name,
      })}
      description={{
        description: translate('defi.modals.saversVaults.description', {
          asset: underlyingAsset?.symbol ?? '',
        }),
        isLoaded: !!underlyingAsset?.symbol,
        isTrustedDescription: true,
      }}
      tvl={bnOrZero(earnOpportunityData.tvl).toFixed(2)}
      apy={earnOpportunityData.apy}
      menu={menu}
      postChildren={
        bnOrZero(opportunityMetadata?.saversMaxSupplyFiat).gt(0) ? renderVaultCap : null
      }
    />
  )
}
