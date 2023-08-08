import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, Tag } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useLocation } from 'react-router'

type DashboardTabProps = {
  label: string
  path: string
  color: string
  rightElement?: JSX.Element
  exact?: boolean
} & ButtonProps

export const DashboardTab = forwardRef<DashboardTabProps, 'button'>(
  ({ path, color, label, rightElement, exact, ...rest }, ref) => {
    const history = useHistory()
    const location = useLocation()
    const translate = useTranslate()
    const handleClick = useCallback(() => {
      history.push(path)
    }, [history, path])

    const isActive = useMemo(() => {
      const match = matchPath(location.pathname, {
        path,
        exact,
        strict: false,
      })
      return !!match
    }, [location.pathname, path, exact])

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
        _active={{ borderColor: `${color}.500`, color: 'chakra-body-text' }}
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
