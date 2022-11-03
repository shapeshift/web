import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useEffect, useMemo } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { foxEthLpAssetId, foxEthLpOpportunityName } from 'state/slices/foxEthSlice/constants'
import {
  selectAssetById,
  selectHighestBalanceAccountIdByLpId,
  selectLpOpportunitiesById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

type FoxEthLpOverviewProps = {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxEthLpOverview: React.FC<FoxEthLpOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const assets = useAppSelector(selectorState => selectorState.assets.byId)

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId ?? '').account : ''),
    [accountId],
  )

  const lpOpportunitiesById = useAppSelector(state => selectLpOpportunitiesById(state))
  const opportunityId = foxEthLpAssetId

  const highestBalanceAccountIdFilter = useMemo(() => ({ lpId: opportunityId }), [opportunityId])
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceAccountIdFilter),
  )

  const opportunityMetadata = useMemo(
    () => lpOpportunitiesById[opportunityId],
    [lpOpportunitiesById, opportunityId],
  )

  const lpAsset = useAppSelector(state => selectAssetById(state, opportunityId ?? ''))

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: opportunityId ?? '',
      accountId: accountId ?? '',
    }),
    [accountId, opportunityId],
  )
  const lpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, lpAssetBalanceFilter),
  )

  const underlyingAssetsWithBalances = useMemo(
    () =>
      opportunityMetadata?.underlyingAssetIds.map((assetId, i) => ({
        ...assets[assetId],
        cryptoBalance: bnOrZero(lpAssetBalance)
          .times(
            fromBaseUnit(opportunityMetadata.underlyingAssetRatios[i], assets[assetId].precision),
          )
          .toString(),
        allocationPercentage: '0.50',
      })),
    [
      assets,
      lpAssetBalance,
      opportunityMetadata?.underlyingAssetIds,
      opportunityMetadata.underlyingAssetRatios,
    ],
  )

  const underlyingAssetsFiatBalanceFilter = useMemo(
    () => ({
      assetId: opportunityId ?? '',
      accountId: accountId ?? '',
    }),
    [accountId, opportunityId],
  )

  const underlyingAssetsFiatBalance = useAppSelector(state =>
    selectPortfolioFiatBalanceByFilter(state, underlyingAssetsFiatBalanceFilter),
  )

  const underlyingAssetsIcons = useMemo(
    () => opportunityMetadata?.underlyingAssetIds.map(assetId => assets[assetId].icon),
    [assets, opportunityMetadata?.underlyingAssetIds],
  )

  const highestBalanceAccountAddress = useMemo(
    () => (highestBalanceAccountId ? fromAccountId(highestBalanceAccountId).account : ''),
    [highestBalanceAccountId],
  )

  useEffect(() => {
    if (highestBalanceAccountId && accountAddress !== highestBalanceAccountAddress) {
      handleAccountIdChange(highestBalanceAccountId)
    }
    // This should NOT have accountAddress dep, else we won't be able to select another account than the defaulted highest balance one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highestBalanceAccountId])

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: lpAsset?.assetId,
    selectedLocale,
  })

  if (!opportunityMetadata || !underlyingAssetsWithBalances) {
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
      icons={underlyingAssetsIcons}
      name={foxEthLpOpportunityName}
      opportunityFiatBalance={underlyingAssetsFiatBalance}
      underlyingAssets={underlyingAssetsWithBalances}
      provider={opportunityMetadata.provider}
      description={{
        description: lpAsset?.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: lpAsset?.isTrustedDescription,
      }}
      tvl={opportunityMetadata.tvl}
      apy={opportunityMetadata.apy}
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
