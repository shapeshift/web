import { Box } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { Text } from 'components/Text'

type DefiModalHeaderProps = {
  headerImageSrc: string
  headerText: string | [string, Record<string, string>]
}

export const DefiModalHeader = ({ headerImageSrc, headerText }: DefiModalHeaderProps) => (
  <>
    <Box textAlign='center'>
      <Image src={headerImageSrc} width='68px' />
    </Box>
    <Box textAlign='center' pt='13px'>
      <Text translation={headerText} fontSize='18px' fontWeight='bold' />
    </Box>
  </>
)
