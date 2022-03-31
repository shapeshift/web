import { Flex, FlexProps } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { Text } from 'components/Text'

type OverviewHeaderProps = {
  assetName: string
  assetIcon: string
} & FlexProps

export const OverviewHeader = ({ assetName, assetIcon, ...styleProps }: OverviewHeaderProps) => (
  <Flex justifyContent='center' alignItems='center' {...styleProps}>
    <Image src={assetIcon} width='100%' minWidth='15px' maxWidth='30px' marginRight='13px' />
    <Text translation={['defi.assetStaking', { assetName }]} fontSize='18px' fontWeight='bold' />
  </Flex>
)
