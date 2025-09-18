import { Box, Card, CardBody, CardHeader, Heading, HStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId, fromAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { StakingTable } from './StakingTable'

import { Text } from '@/components/Text'
import { FoxEthProvider, useFoxEth } from '@/context/FoxEthProvider/FoxEthProvider'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import type { EarnOpportunityType } from '@/state/slices/opportunitiesSlice/types'
import { DefiProvider } from '@/state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from '@/state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssetById,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: AssetId
  accountId?: AccountId
  isLoaded?: boolean
}

export const EarnOpportunitiesContent = ({ assetId, accountId }: EarnOpportunitiesProps) => {
  const { navigate } = useBrowserRouter()
  const location = useLocation()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const { setFarmingAccountId } = useFoxEth()

  useEffect(() => {
    if (accountId) {
      setFarmingAccountId(accountId)
    }
  }, [setFarmingAccountId, accountId])

  const allRows = useMemo(
    () =>
      !asset
        ? []
        : lpOpportunities.concat(stakingOpportunities).filter(
            row =>
              row.assetId.toLowerCase() === asset.assetId.toLowerCase() ||
              (row.underlyingAssetIds.length && row.underlyingAssetIds.includes(asset.assetId)) ||
              // show foxy opportunity in the foxy asset page
              (row.assetId === foxAssetId && asset.assetId === foxyAssetId),
          ),
    [asset, lpOpportunities, stakingOpportunities],
  )

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const { isReadOnly, type, provider, contractAddress, chainId, assetId, rewardAddress } =
        opportunity

      if (isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
      }

      const { assetReference, assetNamespace } = fromAssetId(assetId)
      if (!isConnected) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      if (provider === DefiProvider.rFOX) {
        return navigate('/rfox')
      }

      // @ts-ignore that's incorrect according to types but is absolutely valid
      // The correct signature doesn't cut it and will bork DeFi row click in account/asset page
      navigate({
        pathname: location.pathname,
        search: qs.stringify({
          chainId,
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress: opportunity.highestBalanceAccountAddress,
          rewardId: rewardAddress,
          provider,
          type,
          modal: 'overview',
        }),
        state: { background: location },
      })
    },
    [dispatch, isConnected, location, navigate],
  )

  if (!asset) return null
  if (allRows.length === 0) return null

  return (
    <Card variant='dashboard'>
      <CardHeader flexDir='row' display='flex'>
        <HStack gap={6} width='full'>
          <Box>
            <Heading as='h5'>
              <Text translation='navBar.defi' />
            </Heading>
            <Text color='text.subtle' translation='defi.earnBody' fontWeight='normal' />
          </Box>
        </HStack>
      </CardHeader>
      {Boolean(allRows?.length) && (
        <CardBody pt={0} px={4}>
          <StakingTable data={allRows} onClick={handleClick} />
        </CardBody>
      )}
    </Card>
  )
}

export const EarnOpportunities = ({ assetId, accountId }: EarnOpportunitiesProps) => (
  <FoxEthProvider>
    <EarnOpportunitiesContent assetId={assetId} accountId={accountId} />
  </FoxEthProvider>
)
