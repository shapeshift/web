import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, Tag } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

const tabPaddingY = { base: 4, md: 6 }

type DashboardTabProps = {
  label: string
  path: string
  color: string
  rightElement?: JSX.Element
  exact?: boolean
} & ButtonProps

export const DashboardTab = forwardRef<DashboardTabProps, 'button'>(
  ({ path, color, label, rightElement, exact, ...rest }, ref) => {
    const navigate = useNavigate()
    const location = useLocation()
    const translate = useTranslate()
    const handleClick = useCallback(() => {
      navigate(path)
    }, [navigate, path])

    const isActive = useMemo(() => {
      // Handle special case for /wallet/accounts, since it has subroutes, and we can't use lazy/wildcard match on all
      // since /walelt/accounts/* would also match /wallet (Overview)
      if (path === '/wallet/accounts') {
        const match = matchPath({ path: '/wallet/accounts/*', end: false }, location.pathname)
        return !!match
      }
      const match = matchPath({ path, end: exact }, location.pathname)
      return !!match
    }, [location.pathname, path, exact])

    const buttonActive = useMemo(
      () => ({ borderColor: `${color}.500`, color: 'chakra-body-text' }),
      [color],
    )

    return (
      <Button
        variant='tab'
        ref={ref}
        flexShrink={0}
        py={tabPaddingY}
        onClick={handleClick}
        isActive={isActive}
        borderBottomWidth={4}
        iconSpacing={4}
        letterSpacing='0.012em'
        fontWeight='semibold'
        _active={buttonActive}
        {...(rightElement && {
          rightIcon: <Tag colorScheme={color}>{rightElement}</Tag>,
        })}
        {...rest}
      >
        {translate(label)}
      </Button>
    )
  },
)
