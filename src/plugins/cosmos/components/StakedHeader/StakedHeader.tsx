import { Flex, FlexProps } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import osmosis from 'assets/osmosis.svg'
import { Text } from 'components/Text'

type StakedHeaderProps = {
  assetName: string
} & FlexProps

export const StakedHeader = ({ assetName, ...styleProps }: StakedHeaderProps) => (
  <Flex justifyContent='center' alignItems='center' {...styleProps}>
    <Image src={osmosis} width='100%' minWidth='15px' maxWidth='30px' marginRight='13px' />
    <Text translation={['defi.assetStaking', { assetName }]} fontSize='18px' fontWeight='bold' />
  </Flex>
)
