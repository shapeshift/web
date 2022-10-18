import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, foxAssetId, fromAccountId, toAccountId, toAssetId } from '@shapeshiftoss/caip'
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
import {
  selectAssetById,
  selectFoxFarmingOpportunityByContractAddress,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FoxFarmingEmpty } from './FoxFarmingEmpty'
import { WithdrawCard } from './WithdrawCard'

type FoxFarmingOverviewProps = {
  accountId?: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxFarmingOverview: React.FC<FoxFarmingOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, highestBalanceAccountAddress, contractAddress, assetReference } = query

  const highestBalanceAccountId = useMemo(
    () =>
      highestBalanceAccountAddress
        ? toAccountId({
            account: highestBalanceAccountAddress,
            chainId: ethChainId,
          })
        : null,
    [highestBalanceAccountAddress],
  )
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId ?? '').account : ''),
    [accountId],
  )

  const filter = useMemo(
    () => ({
      accountAddress,
      contractAddress,
    }),
    [accountAddress, contractAddress],
  )

  const opportunity = useAppSelector(state =>
    selectFoxFarmingOpportunityByContractAddress(state, filter),
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
  const cryptoAmountAvailable = bnOrZero(opportunity?.cryptoAmount)
  const fiatAmountAvailable = bnOrZero(opportunity?.fiatAmount)
  const rewardAmountAvailable = bnOrZero(opportunity?.unclaimedRewards)
  const hasClaim = rewardAmountAvailable.gt(0)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  if (!opportunity || !opportunity.isLoaded || !opportunity.apy) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (!opportunity.expired && cryptoAmountAvailable.eq(0) && rewardAmountAvailable.eq(0)) {
    return (
      <FoxFarmingEmpty
        assets={[{ icons: opportunity?.icons! }, rewardAsset]}
        apy={opportunity.apy.toString() ?? ''}
        opportunityName={opportunity.opportunityName || ''}
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
      name={opportunity.opportunityName ?? ''}
      icons={opportunity.icons}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        {
          ...stakingAsset,
          cryptoBalance: cryptoAmountAvailable.toFixed(4),
          allocationPercentage: '1',
          icons: opportunity.icons,
        },
      ]}
      provider='ShapeShift'
      menu={
        opportunity.expired
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
      tvl={opportunity.tvl}
      apy={opportunity.apy?.toString()}
      expired={opportunity.expired}
    >
      <WithdrawCard
        asset={rewardAsset}
        amount={rewardAmountAvailable.toString()}
        expired={opportunity.expired}
      />
    </Overview>
  )
}
