import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useEffect, useMemo, useState } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  supportsUndelegations,
} from 'state/slices/opportunitiesSlice/utils'
import {
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { WithdrawCard } from './WithdrawCard'

type FoxyOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxyOverview: React.FC<FoxyOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query
  const {
    contractAddress,
    stakingAsset,
    underlyingAsset: rewardAsset,
    stakingAssetId,
  } = useFoxyQuery()
  const foxyApi = getFoxyApi()
  const [canClaim, setCanClaim] = useState<boolean | null>(null)
  // The highest level AssetId/OpportunityId, in this case of the single FOXy contract
  const assetId = toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: contractAddress,
  })

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: assetId as StakingId }),
    [assetId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )

  const translate = useTranslate()

  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = accountId ?? highestBalanceAccountId ?? defaultAccountId

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  useEffect(() => {
    if (!maybeAccountId) return
    ;(async () => {
      const canClaimWithdraw = await foxyApi.canClaimWithdraw({
        contractAddress,
        userAddress: fromAccountId(maybeAccountId).account,
      })
      setCanClaim(canClaimWithdraw)
    })()
  }, [contractAddress, foxyApi, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    const userStakingAccountId = accountId ?? highestBalanceAccountId ?? ''
    if (!userStakingAccountId) return undefined
    return {
      userStakingId: serializeUserStakingId(userStakingAccountId, assetId as StakingId),
    }
  }, [accountId, assetId, highestBalanceAccountId])

  const foxyEarnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const undelegations = useMemo(
    () =>
      foxyEarnOpportunityData && supportsUndelegations(foxyEarnOpportunityData)
        ? foxyEarnOpportunityData.undelegations
        : undefined,
    [foxyEarnOpportunityData],
  )

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )
  const cryptoAmountAvailablePrecision = bnOrZero(
    foxyEarnOpportunityData?.stakedAmountCryptoBaseUnit,
  ).div(bn(10).pow(stakingAsset?.precision ?? 0))
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailablePrecision).times(marketData.price)

  const hasPendingUndelegation = Boolean(
    undelegations &&
      undelegations.some(
        undelegation =>
          dayjs().isAfter(dayjs(undelegation.completionTime).unix()) &&
          bnOrZero(undelegation.undelegationAmountCryptoBaseUnit).gt(0),
      ),
  )

  const hasAvailableUndelegation = Boolean(
    undelegations &&
      undelegations.some(
        undelegation =>
          dayjs().isBefore(dayjs(undelegation.completionTime).unix()) &&
          bnOrZero(undelegation.undelegationAmountCryptoBaseUnit).gt(0),
      ),
  )

  const claimDisabled = !canClaim || !(hasAvailableUndelegation || hasPendingUndelegation)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  const underlyingAssetsCryptoPrecision = useMemo(
    () => [
      {
        ...stakingAsset,
        cryptoBalancePrecision: cryptoAmountAvailablePrecision.toFixed(4),
        allocationPercentage: '1',
      },
    ],
    [cryptoAmountAvailablePrecision, stakingAsset],
  )
  const overviewMenu = useMemo(
    () => [
      {
        label: 'common.deposit',
        icon: <ArrowUpIcon />,
        action: DefiAction.Deposit,
        isDisabled: true,
        toolTip: translate('defi.modals.foxyOverview.disabledTitle'),
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
        isLoading: canClaim === null,
        isDisabled: claimDisabled,
        toolTip: translate('defi.modals.overview.noWithdrawals'),
      },
    ],
    [canClaim, claimDisabled, translate],
  )

  const overviewDescription = useMemo(
    () => ({
      description: stakingAsset.description,
      isLoaded: !descriptionQuery.isLoading,
      isTrustedDescription: stakingAsset.isTrustedDescription,
    }),
    [descriptionQuery.isLoading, stakingAsset.description, stakingAsset.isTrustedDescription],
  )

  if (!foxyEarnOpportunityData) {
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
      positionAddress={accountId ? fromAccountId(accountId).account : undefined}
      asset={rewardAsset}
      name='FOX Yieldy'
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoPrecision={underlyingAssetsCryptoPrecision}
      provider={makeDefiProviderDisplayName({
        provider: foxyEarnOpportunityData.provider,
        assetName: stakingAsset.name,
      })}
      menu={overviewMenu}
      description={overviewDescription}
      tvl={bnOrZero(foxyEarnOpportunityData?.tvl).toFixed(2)}
      apy={foxyEarnOpportunityData?.apy?.toString()}
    >
      <WithdrawCard
        asset={stakingAsset}
        undelegation={undelegations?.[0]}
        canClaimWithdraw={canClaim}
      />
    </Overview>
  )
}
