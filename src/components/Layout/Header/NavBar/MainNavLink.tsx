import { Button, IconButtonProps } from '@chakra-ui/react'
import { memo } from 'react'
import { Link as ReactRouterLink, NavLinkProps, useLocation } from 'react-router-dom'

type SidebarLinkProps = {
  icon?: React.ReactElement
  href: string
  label: string
  children?: React.ReactNode
} & NavLinkProps &
  IconButtonProps

export const MainNavLink = memo((props: SidebarLinkProps) => {
  const { href, icon, label } = props
  const location = useLocation()
  const active = location?.pathname.includes(href ?? '')
  return (
    <Button
      as={ReactRouterLink}
      {...props}
      leftIcon={icon}
      width='full'
      justifyContent='flex-start'
      variant='ghost'
      isActive={active}
    >
      {label}
    </Button>
    // <Tooltip label={label} fontSize='md' px={4} hasArrow>
    //   <IconButton
    //     icon={icon}
    //     as={ReactRouterLink}
    //     rounded='full'
    //     isActive={active}
    //     _active={{
    //       bg: 'blue.500',
    //       color: 'white'
    //     }}
    //     {...props}
    //   />
    // </Tooltip>
  )
})
