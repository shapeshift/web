import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, Tag } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

type MenuTabProps = {
  label: string
  path: string
  color: string
  rightElement?: JSX.Element
  exact?: boolean
} & ButtonProps

export const MenuTab = forwardRef<MenuTabProps, 'button'>(
  ({ path, color, label, rightElement, exact, ...rest }, ref) => {
    const navigate = useNavigate()
    const location = useLocation()
    const translate = useTranslate()
    const handleClick = useCallback(() => {
      navigate(path)
    }, [navigate, path])

    const isActive = useMemo(() => {
      const match = matchPath(
        {
          path,
          end: exact,
          caseSensitive: false,
        },
        location.pathname,
      )
      return !!match
    }, [location.pathname, path, exact])

    const activeStyle = useMemo(() => {
      return { borderColor: `${color}.500`, color: 'chakra-body-text' }
    }, [color])

    return (
      <Button
        variant='tab'
        ref={ref}
        flexShrink={0}
        py={6}
        onClick={handleClick}
        isActive={isActive}
        borderBottomWidth={4}
        iconSpacing={4}
        letterSpacing='0.012em'
        fontWeight='medium'
        _active={activeStyle}
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
