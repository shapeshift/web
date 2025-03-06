import { Card, CardBody, CardHeader, Divider } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { StakingInfo } from './StakingInfo'
import { Stats } from './Stats'

import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'

export const Overview: React.FC = () => {
  const { stakingAssetAccountId, supportedStakingAssetIds } = useRFOXContext()

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const Info = useMemo(() => {
    return supportedStakingAssetIds.map((stakingAssetId, i) => (
      <>
        <StakingInfo
          stakingAssetId={stakingAssetId}
          stakingAssetAccountAddress={stakingAssetAccountAddress}
        />
        {i < supportedStakingAssetIds.length - 1 && (
          <Divider my={4} mx={-6} width='calc(100% + 42px)' />
        )}
      </>
    ))
  }, [supportedStakingAssetIds, stakingAssetAccountAddress])

  return (
    <Card>
      <CardHeader pt={6} borderBottomWidth={1} borderColor='border.base'>
        {Info}
      </CardHeader>
      <CardBody pb={6}>
        <Stats />
      </CardBody>
    </Card>
  )
}
