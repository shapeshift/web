import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, Tag } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'

type DashboardTabProps = {
  label: string
  path: string
  color: string
  isActive?: boolean
  fiatAmount?: string
} & ButtonProps

export const DashboardTab = forwardRef<DashboardTabProps, 'button'>(
  ({ path, isActive, color, label, fiatAmount, ...rest }, ref) => {
    const history = useHistory()
    const translate = useTranslate()
    const handleClick = useCallback(() => {
      history.push(path)
    }, [history, path])

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
