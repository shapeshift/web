import { Box, Button, ButtonProps, forwardRef, useMediaQuery } from '@chakra-ui/react'
import { memo } from 'react'
import { NavLinkProps, useLocation } from 'react-router-dom'
import { breakpoints } from 'theme/theme'

type SidebarLinkProps = {
  href?: string
  label: string
  children?: React.ReactNode
  to?: NavLinkProps['to']
  isCompact?: boolean
} & ButtonProps

export const MainNavLink = memo(
  forwardRef<SidebarLinkProps, 'div'>((props: SidebarLinkProps, ref) => {
    const { href, label } = props
    const [isLargerThan2xl] = useMediaQuery(`(min-width: ${breakpoints['2xl']})`)
    const location = useLocation()
    const active = location?.pathname.includes(href ?? '')
    return (
      <Button
        width='full'
        justifyContent='flex-start'
        variant='ghost'
        isActive={href ? active : false}
        minWidth={props?.isCompact ? 'auto' : 10}
        iconSpacing={isLargerThan2xl ? 4 : props?.isCompact ? 0 : 4}
        ref={ref}
        {...props}
      >
        <Box display={{ base: props?.isCompact ? 'none' : 'flex', '2xl': 'block' }}>{label}</Box>
      </Button>
    )
  })
)
