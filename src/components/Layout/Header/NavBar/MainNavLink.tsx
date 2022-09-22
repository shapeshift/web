import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, forwardRef, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { memo } from 'react'
import type { NavLinkProps } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
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
    const active = location?.pathname.includes(href ?? '')
    return (
      <Tooltip label={label} isDisabled={isLargerThan2xl || !isCompact} placement='right'>
        <Button
          width='full'
          justifyContent={{ base: isCompact ? 'center' : 'flex-start', '2xl': 'flex-start' }}
          variant='nav-link'
          isActive={href ? active : false}
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
