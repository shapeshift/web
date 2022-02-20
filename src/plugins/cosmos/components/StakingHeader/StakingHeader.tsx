import { Flex, FlexProps } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import osmosis from 'assets/osmosis.svg'
import { Text } from 'components/Text'

type StakingRowProps = {
  asset: Asset
} & FlexProps
export const StakingHeader = ({ asset, ...styleProps }: StakingRowProps) => (
  <Flex justifyContent='center' alignItems='center' {...styleProps}>
    <Image src={osmosis} width='100%' minWidth='15px' maxWidth='30px' marginRight='13px' />
    <Text
      translation={['defi.assetStaking', { assetName: asset.name }]}
      fontSize='18px'
      fontWeight='bold'
    />
  </Flex>
)
