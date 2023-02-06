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
import { useEffect, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { serializeUserStakingId, toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosEmpty } from './CosmosEmpty'
import { WithdrawCard } from './WithdrawCard'

type CosmosOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const CosmosOverview: React.FC<CosmosOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    // defaultAccountId: queryAccountId, // TODO: do we even need this
    assetNamespace,
    chainId,
    contractAddress: validatorAddress,
    assetReference,
  } = query

  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const validatorId = useMemo(
    () =>
      toValidatorId({
        chainId,
        account: validatorAddress,
      }),
    [chainId, validatorAddress],
  )

  const highestBalanceAccountIdFilter = useMemo(() => ({ stakingId: validatorId }), [validatorId])
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestBalanceAccountId],
  )

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    if (!accountId?.length) return

    return {
      userStakingId: serializeUserStakingId(accountId, validatorId),
    }
  }, [accountId, validatorId])

  const earnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const loaded = useMemo(() => Boolean(earnOpportunityData), [earnOpportunityData])

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  if (!stakingAsset) throw new Error(`Asset not found for AssetId ${stakingAssetId}`)

  const totalBondings = useMemo(
    () =>
      bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit).plus(
        earnOpportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? 0,
      ),
    [
      earnOpportunityData?.rewardsAmountsCryptoBaseUnit,
      earnOpportunityData?.stakedAmountCryptoBaseUnit,
    ],
  )

  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailable = bnOrZero(totalBondings).div(`1e${stakingAsset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  if (!earnOpportunityData) return null

  const hasClaim = bnOrZero(earnOpportunityData?.rewardsAmountsCryptoBaseUnit?.[0]).gt(0)
  const claimDisabled = !hasClaim

  if (!loaded || !earnOpportunityData) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (bnOrZero(totalBondings).eq(0)) {
    return (
      <CosmosEmpty
        assets={[stakingAsset]}
        apy={earnOpportunityData?.apy ?? ''}
        onStakeClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.Deposit,
            }),
          })
        }
        onLearnMoreClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.GetStarted,
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
      name={earnOpportunityData?.name ?? ''} // TODO: This should never be undefined since we'll have at least metadata
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoPrecision={[
        {
          ...stakingAsset,
          cryptoBalancePrecision: cryptoAmountAvailable.toFixed(stakingAsset.precision),
          allocationPercentage: '1',
        },
      ]}
      provider={`${stakingAsset.name} Staking`}
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
        {
          label: 'common.claim',
          icon: <FaGift />,
          action: DefiAction.Claim,
          variant: 'ghost-filled',
          colorScheme: 'green',
          isDisabled: claimDisabled,
          toolTip: translate('defi.modals.overview.noWithdrawals'),
        },
      ]}
      description={{
        description: stakingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: stakingAsset.isTrustedDescription,
      }}
      tvl={bnOrZero(earnOpportunityData?.tvl).toFixed(2)}
      apy={bnOrZero(earnOpportunityData?.apy).toString()}
    >
      <WithdrawCard accountId={accountId} asset={stakingAsset} />
    </Overview>
  )
}
