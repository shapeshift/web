import { Card, CardBody, CardHeader, Flex } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'

import { StakingInformation } from './StakingInformation'
import { Stats } from './Stats'

export const Overview: React.FC = () => {
  const stakingAssetId = foxAssetId

  return (
    <Card>
      <CardHeader pt={6} borderBottomWidth={1} borderColor='border.base'>
        <Flex alignItems='center' gap={2} mb={6}>
          <AssetIcon
            size='sm'
            assetId={stakingAssetId}
            key={stakingAssetId}
            showNetworkIcon={false}
          />
          <Flex flexDir='column'>
            <RawText fontWeight='bold' fontSize='2xl'>
              0.00 FOX
            </RawText>
          </Flex>
        </Flex>
        <StakingInformation />
      </CardHeader>
      <CardBody pb={6}>
        <Stats />
      </CardBody>
    </Card>
  )
}
