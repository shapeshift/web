import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { ReactNode } from 'react'
import foxPageBg from 'assets/foxpage-bg.png'
import { AssetIcon } from 'components/AssetIcon'

import { TrimDescriptionWithEllipsis } from '../utils'

type FoxLayoutProps = {
  children: ReactNode
  icon: string
  title: string
  description: string
}

export const Layout = ({ children, icon, title, description }: FoxLayoutProps) => {
  const descriptionColor = useColorModeValue('gray.750', 'gray.500')
  const trimmedDescription = TrimDescriptionWithEllipsis(description)

  return (
    <>
      <Box
        position='relative'
        textAlign='center'
        py={{ base: 8, md: 12 }}
        mb={{ base: 0, md: 4 }}
        px={{ base: 0, md: 8 }}
      >
        <Box
          backgroundImage={foxPageBg}
          backgroundPosition={'bottom'}
          backgroundSize={'cover'}
          backgroundRepeat={'no-repeat'}
          height='100%'
          width='100%'
          position='absolute'
          bottom='0'
          left='0'
          zIndex='-1'
          display={{ base: 'none', md: 'block' }}
        />
        <Box maxWidth='900px' width='100%' m='auto' px={4}>
          <AssetIcon src={icon} boxSize='12' zIndex={2} mb={2} />
          <Text color='inherit' fontSize='1.125rem' fontWeight='bold' mb={2}>
            {title}
          </Text>
          <Text color={descriptionColor}>{trimmedDescription}</Text>
        </Box>
      </Box>

      <Box px={{ base: 4, md: 20 }}>{children}</Box>
    </>
  )
}
