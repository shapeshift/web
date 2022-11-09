import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { foxAssetId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useEffect, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketData,
  selectSelectedLocale,
  selectUserStakingOpportunityByUserStakingId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingEmpty } from './FoxFarmingEmpty'
import { WithdrawCard } from './WithdrawCard'

type FoxFarmingOverviewProps = {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxFarmingOverview: React.FC<FoxFarmingOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssets)
  const lpAsset = assets[foxEthLpAssetId]
  const marketData = useAppSelector(selectMarketData)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, highestBalanceAccountAddress, contractAddress, assetReference } = query

  const opportunityId = useMemo(
    () => toAssetId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [contractAddress, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId as StakingId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId!,
        toAssetId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }) as StakingId,
      ),
    }),
    [accountId, chainId, contractAddress],
  )
  const opportunityData = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const underlyingAssetsIcons = useMemo(
    () => opportunityData?.underlyingAssetIds.map(assetId => assets[assetId].icon),
    [assets, opportunityData?.underlyingAssetIds],
  )

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId ?? '').account : ''),
    [accountId],
  )

  // TODO: Abstract into a selector, not relying on the LP token but rather on the sum of both underlying tokens fiat value
  const underlyingAssetsFiatBalance = useMemo(() => {
    const cryptoAmount = bnOrZero(opportunityData?.stakedAmountCryptoPrecision).toFixed(2)
    // TODO: add a stakingAssetId property in OpportunityMetadata ?
    const foxEthLpFiatPrice = marketData?.[foxEthLpAssetId]?.price ?? '0'
    return bnOrZero(cryptoAmount).times(foxEthLpFiatPrice).toString()
  }, [marketData, opportunityData?.stakedAmountCryptoPrecision])

  const underlyingAssetsWithBalancesAndIcons = useMemo(
    () =>
      opportunityData?.underlyingAssetIds.map((assetId, i) => ({
        ...assets[assetId],
        cryptoBalance: bnOrZero(opportunityData?.stakedAmountCryptoPrecision)
          .times(fromBaseUnit(opportunityData.underlyingAssetRatios[i], assets[assetId].precision))
          .toFixed(6)
          .toString(),
        icons: [underlyingAssetsIcons![i]],
        allocationPercentage: '0.50',
      })),
    [
      assets,
      opportunityData?.stakedAmountCryptoPrecision,
      opportunityData?.underlyingAssetIds,
      opportunityData?.underlyingAssetRatios,
      underlyingAssetsIcons,
    ],
  )

  const lpAssetWithBalancesAndIcons = useMemo(
    () => ({
      ...lpAsset,
      cryptoBalance: bnOrZero(opportunityData?.stakedAmountCryptoPrecision).toFixed(6),
      allocationPercentage: '1',
      icons: underlyingAssetsIcons,
    }),
    [lpAsset, opportunityData?.stakedAmountCryptoPrecision, underlyingAssetsIcons],
  )

  // Making sure we don't display empty state if account 0 has no farming data for the current opportunity but another account has
  useEffect(() => {
    if (highestBalanceAccountId && accountAddress !== highestBalanceAccountAddress) {
      handleAccountIdChange(highestBalanceAccountId)
    }
    // This should NOT have accountAddress dep, else we won't be able to select another account than the defaulted highest balance one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highestBalanceAccountId])

  const assetNamespace = 'erc20'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const rewardAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const cryptoAmountAvailable = bnOrZero(opportunityData?.stakedAmountCryptoPrecision)
  const rewardAmountAvailable = bnOrZero(opportunityData?.rewardsAmountCryptoPrecision)
  const hasClaim = rewardAmountAvailable.gt(0)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({
    assetId: opportunityData?.underlyingAssetId,
    selectedLocale,
  })

  if (!opportunityData || !underlyingAssetsWithBalancesAndIcons || !underlyingAssetsIcons) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (!opportunityData.expired && cryptoAmountAvailable.eq(0) && rewardAmountAvailable.eq(0)) {
    return (
      <FoxFarmingEmpty
        assets={[{ icons: underlyingAssetsIcons }, rewardAsset]}
        apy={opportunityData.apy.toString() ?? ''}
        opportunityName={opportunityData.name ?? ''}
        onClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.Deposit,
            }),
          })
        }
      />
    )
  }

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={stakingAsset}
      name={opportunityData.name ?? ''}
      icons={underlyingAssetsIcons}
      opportunityFiatBalance={underlyingAssetsFiatBalance}
      lpAsset={lpAssetWithBalancesAndIcons}
      underlyingAssets={underlyingAssetsWithBalancesAndIcons}
      provider='ShapeShift'
      menu={
        opportunityData.expired
          ? [
              {
                label: 'common.withdrawAndClaim',
                icon: <ArrowDownIcon />,
                action: DefiAction.Withdraw,
              },
            ]
          : [
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
              {
                label: 'common.claim',
                icon: <FaGift />,
                action: DefiAction.Claim,
                variant: 'ghost-filled',
                colorScheme: 'green',
                isDisabled: !hasClaim,
                toolTip: translate('defi.modals.overview.noWithdrawals'),
              },
            ]
      }
      description={{
        description: stakingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: stakingAsset.isTrustedDescription,
      }}
      tvl={opportunityData.tvl}
      apy={opportunityData.apy}
      expired={opportunityData.expired}
    >
      <WithdrawCard
        asset={rewardAsset}
        amount={rewardAmountAvailable.toString()}
        expired={opportunityData.expired}
      />
    </Overview>
  )
}
