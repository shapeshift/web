import { Card, CardBody, CardHeader, Divider } from '@chakra-ui/react'
import { foxEthLpArbitrumAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { selectStakingBalance } from 'pages/RFOX/helpers'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingInfo } from './StakingInfo'
import { Stats } from './Stats'

export const Overview: React.FC = () => {
  const { stakingAssetId, stakingAssetAccountId } = useRFOXContext()
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const stakingBalanceCryptoBaseUnitResult = useStakingInfoQuery({
    stakingAssetAccountAddress,
    stakingAssetId,
    select: selectStakingBalance,
  })

  const lpStakingBalanceCryptoBaseUnitResult = useStakingInfoQuery({
    stakingAssetAccountAddress,
    stakingAssetId: foxEthLpArbitrumAssetId,
    select: selectStakingBalance,
  })

  const stakingBalanceCryptoBaseUnitLoading = useMemo(() => {
    return (
      stakingBalanceCryptoBaseUnitResult.isLoading || stakingBalanceCryptoBaseUnitResult.isFetching
    )
  }, [stakingBalanceCryptoBaseUnitResult])

  const lpStakingBalanceCryptoBaseUnitLoading = useMemo(() => {
    return (
      lpStakingBalanceCryptoBaseUnitResult.isLoading ||
      lpStakingBalanceCryptoBaseUnitResult.isFetching
    )
  }, [lpStakingBalanceCryptoBaseUnitResult])

  if (!stakingAsset) return null

  return (
    <Card>
      <CardHeader pt={6} borderBottomWidth={1} borderColor='border.base'>
        <StakingInfo
          stakingAssetId={stakingAssetId}
          stakingAssetAccountAddress={stakingAssetAccountAddress}
          stakingBalanceCryptoBaseUnit={stakingBalanceCryptoBaseUnitResult.data}
          isStakingBalanceCryptoBaseUnitLoading={stakingBalanceCryptoBaseUnitLoading}
        />
        <Divider my={4} mx={-6} width='calc(100% + 42px)' />
        <StakingInfo
          stakingAssetId={foxEthLpArbitrumAssetId}
          stakingAssetAccountAddress={stakingAssetAccountAddress}
          stakingBalanceCryptoBaseUnit={lpStakingBalanceCryptoBaseUnitResult.data}
          isStakingBalanceCryptoBaseUnitLoading={lpStakingBalanceCryptoBaseUnitLoading}
        />
      </CardHeader>
      <CardBody pb={6}>
        <Stats stakingAssetId={stakingAssetId} />
      </CardBody>
    </Card>
  )
}
