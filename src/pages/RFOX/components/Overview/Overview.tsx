import { Card, CardBody, CardHeader, Flex } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'

import { Positions } from './Positions'
import { Totals } from './Totals'

export const Overview: React.FC = () => {
  return (
    <Card>
      <CardHeader pt={6} borderBottomWidth={1} borderColor='border.base'>
        <Flex alignItems='center' gap={2} mb={6}>
          <AssetIcon size='sm' assetId={foxAssetId} key={foxAssetId} showNetworkIcon={false} />
          <Flex flexDir='column'>
            <RawText fontWeight='bold' fontSize='2xl'>
              0.00 FOX
            </RawText>
          </Flex>
        </Flex>
        <Positions />
      </CardHeader>
      <CardBody pb={6}>
        <Totals />
      </CardBody>
    </Card>
  )
}
