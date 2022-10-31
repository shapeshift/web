import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useEffect, useMemo } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectHighestBalanceAccountIdByLpId,
  selectLpOpportunitiesById,
  selectMarketData,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { foxEthLpAssetId, foxEthLpOpportunityName } from '../../../constants'

type FoxEthLpOverviewProps = {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxEthLpOverview: React.FC<FoxEthLpOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const marketData = useAppSelector(selectMarketData)
  const assets = useAppSelector(selectorState => selectorState.assets.byId)

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId ?? '').account : ''),
    [accountId],
  )

  const lpOpportunitiesById = useAppSelector(state => selectLpOpportunitiesById(state))
  const opportunityId = foxEthLpAssetId

  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, { lpId: opportunityId }),
  )

  const opportunityMetadata = useMemo(
    () => lpOpportunitiesById[opportunityId],
    [lpOpportunitiesById, opportunityId],
  )

  const lpAsset = useAppSelector(state => selectAssetById(state, opportunityId ?? ''))
  const lpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: opportunityId ?? '' }),
  )

  const underlyingAssetsWithBalances = useMemo(
    () =>
      opportunityMetadata?.underlyingAssetIds.map((assetId, i) => {
        const asset = assets[assetId]

        return {
          ...asset,
          cryptoBalance: bnOrZero(lpAssetBalance)
            .times(opportunityMetadata.underlyingAssetRatios[i])
            .toString(),
          allocationPercentage: '0.50',
        }
      }),
    [
      assets,
      lpAssetBalance,
      opportunityMetadata?.underlyingAssetIds,
      opportunityMetadata.underlyingAssetRatios,
    ],
  )

  const underlyingAssetsFiatBalance = useMemo(
    () =>
      opportunityMetadata?.underlyingAssetIds.reduce<string>((acc, assetId, i) => {
        const cryptoBalance = bnOrZero(lpAssetBalance)
          .times(opportunityMetadata.underlyingAssetRatios[i])
          .toString()
        const fiatBalance = bn(cryptoBalance).times(marketData[assetId]?.price ?? '0')

        return bn(acc).plus(fiatBalance).toString()
      }, '0'),
    [
      lpAssetBalance,
      marketData,
      opportunityMetadata?.underlyingAssetIds,
      opportunityMetadata.underlyingAssetRatios,
    ],
  )

  const underlyingAssetsIcons = useMemo(
    () =>
      opportunityMetadata?.underlyingAssetIds.map(assetId => {
        const asset = assets[assetId]

        return asset.icon
      }),
    [assets, opportunityMetadata?.underlyingAssetIds],
  )

  const highestBalanceAccountAddress = useMemo(
    () => (accountId ? fromAccountId(highestBalanceAccountId).account : ''),
    [accountId, highestBalanceAccountId],
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
