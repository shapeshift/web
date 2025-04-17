import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex } from '@chakra-ui/react'
import type { JSX } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

type MobileNavLinkProps = {
  label: string
  shortLabel?: string
  path: string
  icon?: JSX.Element
  order?: number
} & ButtonProps

export const MobileNavLink = memo((props: MobileNavLinkProps) => {
  const { label, shortLabel, path, icon, order, ...rest } = props
  const translate = useTranslate()
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = useMemo(() => {
    const match = matchPath(
      {
        path,
        end: false,
        caseSensitive: false,
      },
      location.pathname,
    )
    return !!match
  }, [path, location.pathname])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (isActive) e.preventDefault()
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
      pb={4}
      pt={6}
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
