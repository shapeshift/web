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

export const Layout = ({ children, icon, title, description }: FoxLayoutProps) => {
  const descriptionColor = useColorModeValue('gray.750', 'whiteAlpha.700')

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
        <Box
          minHeight={{ base: '285px', sm: '235px', md: '190px' }}
          maxWidth='900px'
          width='100%'
          m='auto'
          px={4}
        >
          <AssetIcon src={icon} boxSize='12' zIndex={2} mb={2} />
          <Text color='inherit' fontSize='1.125rem' fontWeight='bold' mb={2}>
            {title}
          </Text>
          <Text color={descriptionColor}>{description}</Text>
        </Box>
      </Box>

      <Container px={{ base: 0, md: 20 }} maxW='container.xl'>
        {children}
      </Container>
    </>
  )
}
