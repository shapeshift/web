import { Box } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { Text } from 'components/Text'

type DefiModalHeaderProps = {
  headerImageSrc: string
  headerImageWidth: number
  headerText: string | [string, Record<string, string>]
}

export const DefiModalHeader = ({
  headerImageSrc,
  headerText,
  headerImageWidth
}: DefiModalHeaderProps) => (
  <>
    <Box textAlign='center'>
      <Image
        src={headerImageSrc}
        width='100%'
        minWidth='68px'
        maxWidth={{ base: `${headerImageWidth / 2}px`, sm: `${headerImageWidth}px` }}
      />
    </Box>
    <Box textAlign='center' my='24px'>
      <Text translation={headerText} fontSize='18px' fontWeight='bold' />
    </Box>
  </>
)
