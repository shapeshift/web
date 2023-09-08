import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useEffect, useMemo } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { makeDefiProviderDisplayName } from 'state/slices/opportunitiesSlice/utils'
import {
  selectEarnUserLpOpportunity,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByLpId,
  selectSelectedLocale,
  selectUnderlyingLpAssetsWithBalancesAndIcons,
  selectUserCurrencyBalanceIncludingStakingByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UniV2OverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const UniV2Overview: React.FC<UniV2OverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assets = useAppSelector(selectorState => selectorState.assets.byId)

  const lpAssetId = toAssetId({ chainId, assetNamespace, assetReference })

  const highestBalanceAccountIdFilter = useMemo(() => ({ lpId: lpAssetId as LpId }), [lpAssetId])
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceAccountIdFilter),
  )

  const earnLpOpportunityFilter = useMemo(
    () => ({
      accountId,
      assetId: lpAssetId,
      lpId: lpAssetId as LpId,
    }),
    [accountId, lpAssetId],
  )
  const earnLpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, earnLpOpportunityFilter),
  )

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: lpAssetId,
      accountId,
      lpId: lpAssetId as LpId,
    }),
    [accountId, lpAssetId],
  )
  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingLpAssetsWithBalancesAndIcons(state, lpAssetBalanceFilter),
  )

  const lpAsset = useMemo(
    () => earnLpOpportunity?.assetId && assets[earnLpOpportunity?.assetId],
    [assets, earnLpOpportunity?.assetId],
  )

  const underlyingAssetsFiatBalanceFilter = useMemo(
    () => ({
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )

  const underlyingAssetsFiatBalance = useAppSelector(state =>
    selectUserCurrencyBalanceIncludingStakingByFilter(state, underlyingAssetsFiatBalanceFilter),
  )

  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestBalanceAccountId],
  )

  useEffect(() => {
    if (!maybeAccountId) return
    if (!accountId && highestBalanceAccountId) handleAccountIdChange(highestBalanceAccountId)
    else handleAccountIdChange(maybeAccountId)
  }, [accountId, handleAccountIdChange, highestBalanceAccountId, maybeAccountId])

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: lpAsset?.assetId,
    selectedLocale,
  })

  if (!lpAsset || !earnLpOpportunity?.opportunityName || !underlyingAssetsWithBalancesAndIcons) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={lpAsset}
      icons={earnLpOpportunity.icons}
      name={earnLpOpportunity.opportunityName}
      opportunityFiatBalance={underlyingAssetsFiatBalance}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: earnLpOpportunity.provider,
        assetName: lpAsset.name,
      })}
      description={{
        description: lpAsset?.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: lpAsset?.isTrustedDescription,
      }}
      tvl={earnLpOpportunity.tvl}
      apy={earnLpOpportunity.apy}
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
