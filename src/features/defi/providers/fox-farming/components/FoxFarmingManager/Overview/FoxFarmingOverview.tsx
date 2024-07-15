import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  toOpportunityId,
} from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectFirstAccountIdByChainId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataUserCurrency,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
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
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${foxEthLpAssetId}`)

  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress, rewardId } = query

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference: contractAddress }),
    [chainId, assetNamespace, contractAddress],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, assetNamespace, chainId, contractAddress, highestBalanceAccountId],
  )
  const opportunityData = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const underlyingAssetsIcons: string[] = useMemo(
    () =>
      opportunityData?.underlyingAssetIds
        .map(assetId => assets[assetId]?.icon)
        .map(icon => icon ?? '') ?? [],
    [assets, opportunityData?.underlyingAssetIds],
  )

  const underlyingAssets = useMemo(
    () => opportunityData?.underlyingAssetIds.map(assetId => assets[assetId]).filter(isSome) ?? [],
    [assets, opportunityData?.underlyingAssetIds],
  )

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, opportunityData?.underlyingAssetId ?? ''),
  )

  if (!stakingAsset)
    throw new Error(`Asset not found for AssetId ${opportunityData?.underlyingAssetId}`)

  const underlyingAssetsFiatBalance = useMemo(() => {
    if (!stakingAsset) return '0'

    const cryptoAmount = fromBaseUnit(
      bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit),
      stakingAsset.precision,
    )
    const foxEthLpFiatPrice =
      marketDataUserCurrency?.[opportunityData?.underlyingAssetId ?? '']?.price ?? '0'
    return bnOrZero(cryptoAmount).times(foxEthLpFiatPrice).toString()
  }, [
    marketDataUserCurrency,
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.underlyingAssetId,
    stakingAsset,
  ])

  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingStakingAssetsWithBalancesAndIcons(state, opportunityDataFilter),
  )

  const lpAssetWithBalancesAndIcons = useMemo(
    () => ({
      ...lpAsset,
      cryptoBalancePrecision: fromBaseUnit(
        bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit),
        stakingAsset.precision,
        6,
      ),
      allocationPercentage: '1',
      icons: underlyingAssetsIcons,
    }),
    [
      lpAsset,
      opportunityData?.stakedAmountCryptoBaseUnit,
      stakingAsset.precision,
      underlyingAssetsIcons,
    ],
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

  const rewardAssetId = toAssetId({ chainId, assetNamespace, assetReference: rewardId })
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId))
  if (!rewardAsset) throw new Error(`Asset not found for AssetId ${rewardId}`)

  const cryptoAmountAvailable = bn(
    fromBaseUnit(bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit), stakingAsset.precision),
  )
  const rewardAmountAvailable = bn(
    fromBaseUnit(
      bnOrZero(opportunityData?.rewardsCryptoBaseUnit.amounts[0]),
      rewardAsset.precision,
    ),
  )
  const hasClaim = rewardAmountAvailable.gt(0)

  const handleFoxFarmingEmptyClick = useCallback(
    () =>
      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          ...query,
          modal: DefiAction.Deposit,
        }),
      }),
    [history, location.pathname, query],
  )

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
        assets={underlyingAssets}
        apy={opportunityData.apy?.toString() ?? ''}
        opportunityName={opportunityData.name ?? ''}
        onClick={handleFoxFarmingEmptyClick}
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
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: opportunityData.provider,
        assetName: lpAsset.name,
      })}
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
