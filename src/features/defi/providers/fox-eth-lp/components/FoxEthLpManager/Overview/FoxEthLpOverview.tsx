import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { ethAssetId, foxAssetId } from '@keepkey/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById, selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { foxEthLpOpportunityName } from '../../../constants'

type FoxEthLpOverviewProps = {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxEthLpOverview: React.FC<FoxEthLpOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const {
    foxEthLpOpportunity: opportunity,
    lpFoxBalance: foxBalance,
    lpEthBalance: ethBalance,
    lpLoading: loading,
  } = useFoxEth()

  const lpAsset = useAppSelector(state => selectAssetById(state, opportunity.assetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: lpAsset.assetId, selectedLocale })

  if (loading || !opportunity) {
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
      icons={opportunity.icons}
      name={foxEthLpOpportunityName}
      opportunityFiatBalance={opportunity.fiatAmount}
      underlyingAssets={[
        { ...foxAsset, cryptoBalance: foxBalance ?? '0', allocationPercentage: '0.50' },
        { ...ethAsset, cryptoBalance: ethBalance ?? '0', allocationPercentage: '0.50' },
      ]}
      provider='UNI V2'
      description={{
        description: lpAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: lpAsset.isTrustedDescription,
      }}
      tvl={opportunity.tvl}
      apy={opportunity.apy?.toString()}
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
