import { Box, Image } from '@chakra-ui/react'
import { useMemo } from 'react'
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
}: DefiModalHeaderProps) => {
  const imageMaxWidth = useMemo(
    () => ({ base: `${headerImageMaxWidth / 2}px`, sm: `${headerImageMaxWidth}px` }),
    [headerImageMaxWidth],
  )

  return (
    <>
      <Box textAlign='center'>
        <Image src={headerImageSrc} width='100%' minWidth='68px' maxWidth={imageMaxWidth} />
      </Box>
      <Box textAlign='center' my='24px'>
        <Text translation={headerText} fontSize='18px' fontWeight='bold' />
      </Box>
    </>
  )
}
