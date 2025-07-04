import { Card, CardBody, CardHeader, Divider } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { StakingInfo } from './StakingInfo'
import { Stats } from './Stats'

import { supportedStakingAssetIds, useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'

export const Overview: React.FC = () => {
  const { stakingAssetAccountId } = useRFOXContext()

  const Info = useMemo(() => {
    return supportedStakingAssetIds.map((stakingAssetId, i) => (
      <>
        <StakingInfo
          stakingAssetId={stakingAssetId}
          stakingAssetAccountId={stakingAssetAccountId}
        />
        {i < supportedStakingAssetIds.length - 1 && (
          <Divider my={4} mx={-6} width='calc(100% + 42px)' />
        )}
      </>
    ))
  }, [stakingAssetAccountId])

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
