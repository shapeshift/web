import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

import { vibrate } from '@/lib/vibrate'
import type { Route } from '@/Routes/helpers'

type MobileNavLinkProps = ButtonProps &
  Route & {
    order?: number
  }
export const MobileNavLink = memo((props: MobileNavLinkProps) => {
  const { label, shortLabel, path, icon, order, disable: _disable, relatedPaths, ...rest } = props
  const translate = useTranslate()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = useMemo(() => {
    if (!relatedPaths?.length) {
      const match = matchPath(
        {
          path,
          end: false,
          caseSensitive: false,
        },
        location.pathname,
      )

      return !!match
    }

    const match = relatedPaths.find(tradingPath => {
      const match = matchPath(
        {
          path: tradingPath,
          end: false,
          caseSensitive: false,
        },
        location.pathname,
      )

      return !!match
    })

    return !!match
  }, [location.pathname, path, relatedPaths])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (isActive) e.preventDefault()
      vibrate('heavy')
      // Replace paths with segments (e.g /wallet/*) to paths without (e.g /wallet)
      navigate(path.replace('/*', ''))
    },
    [isActive, navigate, path],
  )

  return (
    <Button
      key={path}
      flexDir='column'
      fontSize='24px'
      gap={2}
      height='auto'
      order={order}
      variant='nav-link'
      isActive={isActive}
      fontWeight='medium'
      onClick={handleClick}
      pb={3}
      pt={5}
      flex={1}
      zIndex='sticky'
      {...rest}
    >
      {icon}
      <Flex flexDir='column' fontSize='11px' letterSpacing='-0.020em'>
        {translate(shortLabel ?? label)}
      </Flex>
    </Button>
  )
})
