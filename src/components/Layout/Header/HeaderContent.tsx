import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Flex, IconButton, Portal, Stack, useColorModeValue } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { pathTo, Route } from 'Routes/helpers'
import { FoxIcon } from 'components/Icons/FoxIcon'

import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

export const HeaderContent = ({ route }: { route: Route }) => {
  const navbarBg = useColorModeValue('white', 'gray.800')
  const navbarBorder = useColorModeValue('gray.100', 'gray.750')
  const navShadow = useColorModeValue('lg', 'dark-lg')
  return (
    <Flex px={4} width='full' justifyContent='space-between'>
      <Flex
        width='full'
        h={16}
        alignItems={'center'}
        justifyContent={'space-between'}
        data-test='full-width-header'
      >
        <Box display='flex' alignItems='center' flex={2}>
          {pathTo(route).map((crumb, index, breadcrumbs) => (
            <div key={index} className='item'>
              {index < breadcrumbs.length - 1 && crumb.path && (
                <IconButton
                  icon={<ArrowBackIcon />}
                  aria-label={crumb.label}
                  as={RouterLink}
                  to={crumb.path}
                  size='md'
                  isRound
                  mr={2}
                />
              )}
            </div>
          ))}
          <RouterLink to='/dashboard'>
            <FoxIcon
              w={{ base: '30px', lg: '40px' }}
              h={{ base: '30px', lg: '40px' }}
              display={{ base: 'none', md: 'block' }}
            />
          </RouterLink>
        </Box>
        <RouterLink to='/dashboard'>
          <FoxIcon
            w={{ base: '30px', lg: '40px' }}
            h={{ base: '30px', lg: '40px' }}
            display={{ base: 'block', md: 'none' }}
            justifySelf='flex-end'
          />
        </RouterLink>
        <NavBar display={{ base: 'none', md: 'flex' }} />
        <Flex alignItems='center' justifyContent='flex-end' flex={2}>
          <UserMenu />
        </Flex>
      </Flex>
      <Portal>
        <Box
          position='fixed'
          width='full'
          display={{ base: 'inline-block', md: 'none' }}
          bottom={0}
          pb={'env(safe-area-inset-bottom)'}
          left='50%'
          transform='translateX(-50%)'
          bg={navbarBg}
          borderTopWidth={1}
          borderColor={navbarBorder}
          boxShadow={navShadow}
        >
          <Stack as={'nav'} spacing={4} p={2}>
            <NavBar />
          </Stack>
        </Box>
      </Portal>
    </Flex>
  )
}
