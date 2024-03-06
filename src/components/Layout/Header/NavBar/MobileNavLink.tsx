import { Button, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, matchPath, useLocation } from 'react-router-dom'
import type { Route } from 'Routes/helpers'

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
      fontSize='24px'
      gap={2}
      height='auto'
      variant='nav-link'
      isActive={isActive}
      fontWeight='medium'
      onClick={handleClick}
      pb={4}
      pt={6}
      flex={1}
      zIndex='sticky'
    >
      {icon}
      <Flex flexDir='column' fontSize='11px' letterSpacing='-0.020em'>
        {translate(shortLabel ?? label)}
      </Flex>
    </Button>
  )
})
