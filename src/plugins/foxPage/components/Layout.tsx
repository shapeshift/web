import { Box, Container, Text, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import foxPageBg from 'assets/foxpage-bg.png'
import { AssetIcon } from 'components/AssetIcon'

type FoxLayoutProps = {
  children: ReactNode
  icon: string
  title: string
  description: string
}

const boxPy = { base: 8, md: 12 }
const boxMb = { base: 0, md: 4 }
const boxPx = { base: 0, md: 8 }
const boxDisplay = { base: 'none', md: 'block' }
const boxMinHeight = { base: '285px', sm: '235px', md: '190px' }
const containerPx = { base: 0, md: 16 }

export const Layout = ({ children, icon, title, description }: FoxLayoutProps) => {
  const descriptionColor = useColorModeValue('gray.750', 'whiteAlpha.700')

  return (
    <>
      <Box position='relative' textAlign='center' py={boxPy} mb={boxMb} px={boxPx}>
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
          display={boxDisplay}
        />
        <Box minHeight={boxMinHeight} maxWidth='900px' width='100%' m='auto' px={4}>
          <AssetIcon src={icon} boxSize='12' zIndex={2} mb={2} />
          <Text color='inherit' fontSize='1.125rem' fontWeight='bold' mb={2}>
            {title}
          </Text>
          <Text color={descriptionColor}>{description}</Text>
        </Box>
      </Box>

      <Container px={containerPx} maxW='container.4xl'>
        {children}
      </Container>
    </>
  )
}
