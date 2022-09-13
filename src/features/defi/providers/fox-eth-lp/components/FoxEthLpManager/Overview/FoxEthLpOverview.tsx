import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center, CircularProgress } from '@chakra-ui/react'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { foxEthLpOpportunityName } from 'state/slices/foxEthSlice/constants'
import {
  selectAssetById,
  selectFoxEthLpOpportunity,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const FoxEthLpOverview = () => {
  const opportunity = useAppSelector(selectFoxEthLpOpportunity)
  const { underlyingFoxAmount, underlyingEthAmount } = opportunity
  const { setAccountId: handleAccountIdChange } = useFoxEth()

  const lpAsset = useAppSelector(state => selectAssetById(state, opportunity.assetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: lpAsset.assetId, selectedLocale })

  if (!opportunity || !opportunity.isLoaded) {
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
      onAccountIdChange={handleAccountIdChange}
      asset={lpAsset}
      icons={opportunity.icons}
      name={foxEthLpOpportunityName}
      opportunityFiatBalance={opportunity.fiatAmount}
      underlyingAssets={[
        { ...foxAsset, cryptoBalance: underlyingFoxAmount ?? '0', allocationPercentage: '0.50' },
        { ...ethAsset, cryptoBalance: underlyingEthAmount ?? '0', allocationPercentage: '0.50' },
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
