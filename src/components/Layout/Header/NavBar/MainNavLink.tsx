import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Tag, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useTransition } from 'react'
import { useTranslate } from 'react-polyglot'
import type { NavLinkProps } from 'react-router-dom'
import { useHistory } from 'react-router-dom'

import { CircleIcon } from '@/components/Icons/Circle'
import { breakpoints } from '@/theme/theme'

type SidebarLinkProps = {
  href?: string
  label: string
  children?: React.ReactNode
  to?: NavLinkProps['to']
  isCompact?: boolean
  isNew?: boolean
  isViewOnly?: boolean
  isActive?: boolean
} & ButtonProps

const styleProp = { width: '0.5em', height: '0.5em', color: 'var(--chakra-colors-pink-200)' }
const hoverProp = { bg: 'background.button.secondary.base' }
const activeProp = {
  bg: 'transparent',
  color: 'text.base',
  fontWeight: 'bold',
}

export const MainNavLink = memo((props: SidebarLinkProps) => {
  const { isCompact, onClick, isNew, isViewOnly, label, isActive, buttonProps } = useMemo(() => {
    const { isCompact, onClick, isNew, isViewOnly, label, isActive, ...buttonProps } = props
    return { isCompact, onClick, isNew, isViewOnly, label, isActive, buttonProps }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  const [isNavigationPending, startNavTransition] = useTransition()
  const history = useHistory()
  const [isLargerThan2xl] = useMediaQuery(`(min-width: ${breakpoints['2xl']})`)
  const translate = useTranslate()

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    e => {
      if (isActive) {
        e.preventDefault()
        return
      }

      if (onClick) return onClick(e)

      if (props.to) {
        e.preventDefault()
        startNavTransition(() => {
          history.push(props.to as string)
        })
      }
    },
    [isActive, onClick, props.to, history, startNavTransition],
  )

  const justifyContentProp = useMemo(
    () => ({ base: isCompact ? 'center' : 'flex-start', '2xl': 'flex-start' }),
    [isCompact],
  )

  const displayProp1 = useMemo(
    () => ({ base: isCompact ? 'none' : 'inline-flex', '2xl': 'inline-flex' }),
    [isCompact],
  )

  const displayProp2 = useMemo(
    () => ({ base: isCompact ? 'none' : 'flex', '2xl': 'block' }),
    [isCompact],
  )

  const displayProp3 = useMemo(
    () => ({ base: isCompact ? 'block' : 'none', '2xl': 'none' }),
    [isCompact],
  )

  return (
    <Tooltip label={label} isDisabled={isLargerThan2xl || !isCompact} placement='right'>
      <Button
        width='full'
        justifyContent={justifyContentProp}
        variant='nav-link'
        isActive={isActive}
        onClick={handleClick}
        position='relative'
        fontWeight='medium'
        minWidth={isCompact ? 'auto' : 10}
        iconSpacing={isLargerThan2xl ? 4 : isCompact ? 0 : 4}
        _active={activeProp}
        _hover={hoverProp}
        opacity={isNavigationPending ? 0.7 : 1}
        {...buttonProps}
      >
        <Box display={displayProp2}>{label}</Box>
        {isNew && (
          <>
            <Tag ml='auto' colorScheme='pink' display={displayProp1}>
              {translate('common.new')}
            </Tag>
            <CircleIcon
              style={styleProp}
              right={0}
              top={0}
              position='absolute'
              display={displayProp3}
            />
          </>
        )}
        {isViewOnly && (
          <Tag ml='auto' size='sm' colorScheme='blue' display={displayProp1}>
            {translate('common.viewOnly')}
          </Tag>
        )}
      </Button>
    </Tooltip>
  )
})
