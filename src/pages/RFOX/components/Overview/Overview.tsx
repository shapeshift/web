import { Card, CardBody, CardHeader, Divider } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { RFOX_STAKING_ASSET_IDS } from 'pages/RFOX/constants'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'

import { StakingInfo } from './StakingInfo'
import { Stats } from './Stats'

export const Overview: React.FC = () => {
  const { stakingAssetAccountId } = useRFOXContext()

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  return (
    <Card>
      <CardHeader pt={6} borderBottomWidth={1} borderColor='border.base'>
        {RFOX_STAKING_ASSET_IDS.map((stakingAssetId, i) => (
          <>
            <StakingInfo
              stakingAssetId={stakingAssetId}
              stakingAssetAccountAddress={stakingAssetAccountAddress}
            />
            {i < RFOX_STAKING_ASSET_IDS.length - 1 && (
              <Divider my={4} mx={-6} width='calc(100% + 42px)' />
            )}
          </>
        ))}
      </CardHeader>
      <CardBody pb={6}>
        <Stats />
      </CardBody>
    </Card>
  )
}
