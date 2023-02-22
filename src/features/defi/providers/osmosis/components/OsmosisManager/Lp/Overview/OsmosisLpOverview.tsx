import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useEffect, useMemo, useState } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import type { OsmosisPool } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { makeDefiProviderDisplayName, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserLpOpportunity,
  selectHighestBalanceAccountIdByLpId,
  selectMarketDataById,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type OsmosisOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const OsmosisLpOverview: React.FC<OsmosisOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [osmosisPool, setOsmosisPool] = useState<OsmosisPool | undefined>()
  const { chainId, assetReference } = query
  const assetNamespace = ASSET_NAMESPACE.ibc

  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const osmosisOpportunityId: LpId | undefined = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ lpId: osmosisOpportunityId }),
    [osmosisOpportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceAccountIdFilter),
  )

  const maybeAccountId = accountId ?? highestBalanceAccountId

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(
    () => ({
      lpId: osmosisOpportunityId,
      assetId,
      accountId: maybeAccountId,
    }),
    [assetId, maybeAccountId, osmosisOpportunityId],
  )

  const osmosisOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, opportunityDataFilter),
  )

  const lpAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const lpAsset: Asset | undefined = useAppSelector(state => selectAssetById(state, lpAssetId))

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )

  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )

  useEffect(() => {
    ;(async () => {
      const id = getPoolIdFromAssetReference(fromAssetId(lpAssetId).assetReference)
      if (!id) return
      const poolData = await getPool(id)
      setOsmosisPool(poolData)
    })()
  }, [lpAssetId])

  const underlyingAssetsCryptoPrecision = useMemo(() => {
    if (!(osmosisOpportunity && underlyingAsset0 && underlyingAsset1 && osmosisPool))
      return undefined

    if (
      !(
        osmosisPool &&
        osmosisPool.pool_assets &&
        osmosisPool.total_shares &&
        osmosisPool.total_weight !== '0'
      )
    ) {
      return undefined
    }

    const poolOwnershipFraction = bnOrZero(osmosisOpportunity.cryptoAmountBaseUnit)
      .dividedBy(bnOrZero(osmosisPool.total_shares.amount))
      .toString()

    const underlyingAsset0AllocationPercentage = bnOrZero(osmosisPool.pool_assets[0].weight)
      .dividedBy(bnOrZero(osmosisPool.total_weight))
      .toString()
    const underlyingAsset1AllocationPercentage = bnOrZero(osmosisPool.pool_assets[1].weight)
      .dividedBy(bnOrZero(osmosisPool.total_weight))
      .toString()

    const underlyingAsset0Balance = bnOrZero(poolOwnershipFraction)
      .multipliedBy(osmosisPool.pool_assets[0].token.amount)
      .toString()
    const underlyingAsset1Balance = bnOrZero(poolOwnershipFraction)
      .multipliedBy(osmosisPool.pool_assets[1].token.amount)
      .toString()

    const underlyingAsset0CryptoBalancePrecision = bnOrZero(underlyingAsset0Balance)
      .dividedBy(bn(10).pow(bnOrZero(underlyingAsset0?.precision)))
      .toFixed(2)
      .toString()

    const underlyingAsset1CryptoBalancePrecision = bnOrZero(underlyingAsset1Balance)
      .dividedBy(bn(10).pow(bnOrZero(underlyingAsset1?.precision)))
      .toFixed(2)
      .toString()

    return [
      {
        ...underlyingAsset0,
        allocationPercentage: underlyingAsset0AllocationPercentage,
        cryptoBalancePrecision: underlyingAsset0CryptoBalancePrecision,
      },
      {
        ...underlyingAsset1,
        allocationPercentage: underlyingAsset1AllocationPercentage,
        cryptoBalancePrecision: underlyingAsset1CryptoBalancePrecision,
      },
    ]
  }, [osmosisOpportunity, osmosisPool, underlyingAsset0, underlyingAsset1])

  const lpMarketData = useAppSelector(state => selectMarketDataById(state, lpAssetId))
  const opportunityFiatBalance = bnOrZero(osmosisOpportunity?.cryptoAmountBaseUnit)
    .div(bn(10).pow(lpAsset?.precision ?? 0))
    .times(lpMarketData.price)
    .toFixed()

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: lpAsset?.assetId,
    selectedLocale,
  })

  if (!(lpAsset && osmosisOpportunity?.opportunityName && underlyingAssetsCryptoPrecision))
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={lpAsset}
      icons={osmosisOpportunity.icons}
      name={osmosisOpportunity.opportunityName}
      opportunityFiatBalance={opportunityFiatBalance}
      underlyingAssetsCryptoPrecision={underlyingAssetsCryptoPrecision}
      provider={makeDefiProviderDisplayName({
        provider: osmosisOpportunity.provider,
        assetName: lpAsset.name,
      })}
      description={{
        description: lpAsset?.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: lpAsset?.isTrustedDescription,
      }}
      tvl={bnOrZero(osmosisOpportunity.tvl).toFixed(2)}
      apy={osmosisOpportunity.apy}
      menu={[
        {
          label: 'common.deposit',
          icon: <ArrowUpIcon />,
          action: DefiAction.Deposit,
        },
        {
          label: 'common.withdraw',
          icon: <ArrowDownIcon />,
          action: DefiAction.Withdraw,
        },
      ]}
    />
  )
}
