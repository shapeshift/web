import { ArrowBackIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Flex, IconButton, SimpleGrid, useMediaQuery } from '@chakra-ui/react'
import React, { PropsWithChildren } from 'react'
import { useHistory } from 'react-router'
import { RawText } from 'components/Text'
import { breakpoints } from 'theme/theme'

const arrowBack = <ArrowBackIcon />

type MobileSubpageHeaderProps = {
  title?: string
}

export const SubpageHeader: React.FC<MobileSubpageHeaderProps> = ({ title }) => {
  const { goBack } = useHistory()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isLargerThanMd) return null
  return (
    <SimpleGrid
      gridTemplateColumns='44px 1fr 44px'
      px={4}
      alignItems='center'
      position='sticky'
      top={0}
      left={0}
      right={0}
      bg='background.surface.base'
      pt='env(safe-area-inset-top)'
      zIndex='sticky'
      pb={2}
    >
      <Flex>
        <IconButton
          fontSize='2xl'
          variant='ghost'
          order='1'
          aria-label='go back'
          isRound
          onClick={goBack}
          icon={arrowBack}
        />
      </Flex>
      <RawText order='2' textAlign='center' fontWeight='semibold'>
        {title}
      </RawText>
    </SimpleGrid>
  )
}
const Left: React.FC<FlexProps> = props => <Flex order='1' {...props} />
const Middle: React.FC<FlexProps> = props => (
  <Flex order='2' textAlign='center' fontWeight='semibold' {...props} />
)
const Right: React.FC<FlexProps> = props => (
  <Flex order='3' justifyContent='flex-end' alignItems='center' {...props} />
)
