import { Button, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, matchPath, useLocation } from 'react-router-dom'
import type { Route } from 'Routes/helpers'

const activeProp = { bg: 'transparent', svg: { color: 'blue.200' } }

export const MobileNavLink = memo(({ label, shortLabel, path, icon }: Route) => {
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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => isActive && e.preventDefault(),
    [isActive],
  )

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
      onClick={handleClick}
      _active={activeProp}
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
})
