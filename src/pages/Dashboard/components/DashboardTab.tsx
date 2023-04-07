import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, Tag } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'

type DashboardTabProps = {
  label: string
  path: string
  color: string
  fiatAmount?: string
} & ButtonProps

export const DashboardTab = forwardRef<DashboardTabProps, 'button'>(
  ({ path, color, label, fiatAmount, ...rest }, ref) => {
    const history = useHistory()
    const location = useLocation()
    const translate = useTranslate()
    const handleClick = useCallback(() => {
      history.push(path)
    }, [history, path])

    const isActive = useMemo(() => {
      const match = matchPath(location.pathname, {
        path,
        exact: false,
        strict: true,
      })
      return !!match
    }, [path, location.pathname])

    return (
      <Button
        variant='tab'
        ref={ref}
        flexShrink={0}
        onClick={handleClick}
        isActive={isActive}
        borderBottomWidth={4}
        fontWeight='bold'
        _active={{ borderColor: color, color: 'chakra-body-text' }}
        {...(fiatAmount && {
          rightIcon: (
            <Tag>
              <Amount.Fiat value={fiatAmount} />
            </Tag>
          ),
        })}
        {...rest}
      >
        {translate(label)}
      </Button>
    )
  },
)
