import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
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
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import { makeDefiProviderDisplayName } from 'state/slices/opportunitiesSlice/utils'
import {
  selectEarnUserLpOpportunity,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByLpId,
  selectPortfolioFiatBalanceByFilter,
  selectSelectedLocale,
  selectUnderlyingLpAssetsWithBalancesAndIcons,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type FoxEthLpOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxEthLpOverview: React.FC<FoxEthLpOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query
  const assets = useAppSelector(selectorState => selectorState.assets.byId)

  const opportunityId = foxEthLpAssetId

  const highestBalanceAccountIdFilter = useMemo(() => ({ lpId: opportunityId }), [opportunityId])
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceAccountIdFilter),
  )

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      accountId,
      assetId: opportunityId,
      lpId: opportunityId,
    }),
    [accountId, opportunityId],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: opportunityId,
      accountId,
      lpId: opportunityId,
    }),
    [accountId, opportunityId],
  )
  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingLpAssetsWithBalancesAndIcons(state, lpAssetBalanceFilter),
  )

  const lpAsset = useMemo(
    () => foxEthLpOpportunity?.underlyingAssetId && assets[foxEthLpOpportunity?.underlyingAssetId],
    [assets, foxEthLpOpportunity?.underlyingAssetId],
  )

  const underlyingAssetsFiatBalanceFilter = useMemo(
    () => ({
      assetId: opportunityId,
      accountId,
    }),
    [accountId, opportunityId],
  )

  const underlyingAssetsFiatBalance = useAppSelector(state =>
    selectPortfolioFiatBalanceByFilter(state, underlyingAssetsFiatBalanceFilter),
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

  if (!lpAsset || !foxEthLpOpportunity?.opportunityName || !underlyingAssetsWithBalancesAndIcons) {
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
      icons={foxEthLpOpportunity.icons}
      name={foxEthLpOpportunity.opportunityName}
      opportunityFiatBalance={underlyingAssetsFiatBalance}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: foxEthLpOpportunity.provider,
        assetName: lpAsset.name,
      })}
      description={{
        description: lpAsset?.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: lpAsset?.isTrustedDescription,
      }}
      tvl={foxEthLpOpportunity.tvl}
      apy={foxEthLpOpportunity.apy}
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
