import { Box } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { Text } from 'components/Text'

type DefiModalHeaderProps = {
  headerImageSrc: string
  headerImageMaxWidth: number
  headerText: string | [string, Record<string, string>]
}

export const DefiModalHeader = ({
  headerImageSrc,
  headerText,
  headerImageMaxWidth,
}: DefiModalHeaderProps) => (
  <>
    <Box textAlign='center'>
      <Image
        src={headerImageSrc}
        width='100%'
        minWidth='68px'
        maxWidth={{ base: `${headerImageMaxWidth / 2}px`, sm: `${headerImageMaxWidth}px` }}
      />
    </Box>
    <Box textAlign='center' my='24px'>
      <Text translation={headerText} fontSize='18px' fontWeight='bold' />
    </Box>
  </>
)
