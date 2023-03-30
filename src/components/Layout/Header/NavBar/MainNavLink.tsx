import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, forwardRef, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import type { NavLinkProps } from 'react-router-dom'
import { matchPath, useLocation } from 'react-router-dom'
import { breakpoints } from 'theme/theme'

type SidebarLinkProps = {
  href?: string
  label: string
  children?: React.ReactNode
  to?: NavLinkProps['to']
  isCompact?: boolean
} & ButtonProps

export const MainNavLink = memo(
  forwardRef<SidebarLinkProps, 'div'>(({ isCompact, ...rest }: SidebarLinkProps, ref) => {
    const { href, label } = rest
    const [isLargerThan2xl] = useMediaQuery(`(min-width: ${breakpoints['2xl']})`, { ssr: false })
    const location = useLocation()
    const isActive = useMemo(() => {
      const match = matchPath(location.pathname, {
        path: href,
        exact: false,
        strict: false,
      })
      return !!match
    }, [href, location.pathname])
    return (
      <Tooltip label={label} isDisabled={isLargerThan2xl || !isCompact} placement='right'>
        <Button
          width='full'
          justifyContent={{ base: isCompact ? 'center' : 'flex-start', '2xl': 'flex-start' }}
          variant='nav-link'
          isActive={isActive}
          minWidth={isCompact ? 'auto' : 10}
          iconSpacing={isLargerThan2xl ? 4 : isCompact ? 0 : 4}
          ref={ref}
          {...rest}
        >
          <Box display={{ base: isCompact ? 'none' : 'flex', '2xl': 'block' }}>{label}</Box>
        </Button>
      </Tooltip>
    )
  }),
)
