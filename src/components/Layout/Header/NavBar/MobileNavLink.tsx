import { Button, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, matchPath, useLocation } from 'react-router-dom'
import type { Route } from 'Routes/helpers'

export const MobileNavLink = ({ label, shortLabel, path, icon }: Route) => {
  const translate = useTranslate()
  const location = useLocation()
  const isActive = useMemo(() => {
    const match = matchPath(location.pathname, {
      path,
      exact: false,
      strict: false,
    })
    return !!match
  }, [path, location.pathname])

  return (
    <Button
      key={path}
      as={ReactRouterLink}
      to={path}
      flexDir='column'
      fontSize='2xl'
      gap={2}
      height='auto'
      variant='nav-link'
      isActive={isActive}
      fontWeight='medium'
      onClick={e => isActive && e.preventDefault()}
      _active={{ bg: 'transparent', svg: { color: 'blue.200' } }}
      py={2}
      width='full'
      zIndex='sticky'
    >
      {icon}
      <Flex flexDir='column' fontSize='xs' color={isActive ? 'white' : 'text.subtle'}>
        {translate(shortLabel ?? label)}
      </Flex>
    </Button>
  )
}
