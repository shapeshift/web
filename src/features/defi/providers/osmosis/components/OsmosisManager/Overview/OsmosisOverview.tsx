import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import type { AssetWithBalance } from 'features/defi/components/Overview/Overview'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserLpOpportunity,
  selectPortfolioCryptoBalanceByFilter,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type opportunityBalances =
  | { underlyingAssetBalances: AssetWithBalance[]; fiatBalance: string }
  | undefined

type OsmosisOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const OsmosisOverview: React.FC<OsmosisOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [opportunityBalances, setOpportunityBalances] = useState<opportunityBalances>(undefined)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const osmosisOpportunityId: LpId | undefined = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const opportunityDataFilter = useMemo(
    () => ({
      lpId: osmosisOpportunityId,
      assetId,
      accountId,
    }),
    [accountId, assetId, osmosisOpportunityId],
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

  const lpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: lpAsset?.assetId,
      accountId: accountId ?? '',
    }),
  )

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )

  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )

  const calculateBalances = useCallback(
    async (
      lpAsset: Asset,
      lpAssetBalanceBaseUnit: string,
    ): Promise<opportunityBalances | undefined> => {
      if (!(osmosisOpportunity && underlyingAsset0 && underlyingAsset1)) return undefined

      const id = getPoolIdFromAssetReference(fromAssetId(lpAsset.assetId).assetReference)
      if (!id) return undefined
      const poolData = await getPool(id)

      if (
        !(
          poolData &&
          poolData.pool_assets &&
          poolData.total_shares &&
          poolData.total_weight !== '0'
        )
      ) {
        return undefined
      }

      const poolOwnershipFraction = bnOrZero(lpAssetBalanceBaseUnit)
        .dividedBy(bnOrZero(poolData.total_shares.amount))
        .toString()

      const underlyingAsset0AllocationPercentage = bnOrZero(poolData.pool_assets[0].weight)
        .dividedBy(bnOrZero(poolData.total_weight))
        .toString()
      const underlyingAsset1AllocationPercentage = bnOrZero(poolData.pool_assets[1].weight)
        .dividedBy(bnOrZero(poolData.total_weight))
        .toString()

      const underlyingAsset0Balance = bnOrZero(poolOwnershipFraction)
        .multipliedBy(poolData.pool_assets[0].token.amount)
        .toString()
      const underlyingAsset1Balance = bnOrZero(poolOwnershipFraction)
        .multipliedBy(poolData.pool_assets[1].token.amount)
        .toString()

      const underlyingAsset0CryptoBalancePrecision = bnOrZero(underlyingAsset0Balance)
        .dividedBy(bn(10).pow(bnOrZero(underlyingAsset0?.precision)))
        .toFixed(2)
        .toString()

      const underlyingAsset1CryptoBalancePrecision = bnOrZero(underlyingAsset1Balance)
        .dividedBy(bn(10).pow(bnOrZero(underlyingAsset1?.precision)))
        .toFixed(2)
        .toString()

      return {
        underlyingAssetBalances: [
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
        ],
        fiatBalance: bnOrZero(poolOwnershipFraction)
          .multipliedBy(bnOrZero(osmosisOpportunity.tvl))
          .toString(),
      }
    },
    [osmosisOpportunity, underlyingAsset0, underlyingAsset1],
  )

  useEffect(() => {
    if (!lpAsset) return
    if (opportunityBalances) return
    ;(async () => {
      const balances = await calculateBalances(lpAsset, lpAssetBalance)
      setOpportunityBalances(balances)
    })()
  })

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: lpAsset?.assetId,
    selectedLocale,
  })

  if (!(lpAsset && osmosisOpportunity?.opportunityName && opportunityBalances))
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
      opportunityFiatBalance={opportunityBalances.fiatBalance}
      underlyingAssetsCryptoPrecision={opportunityBalances.underlyingAssetBalances}
      provider={osmosisOpportunity.provider}
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
