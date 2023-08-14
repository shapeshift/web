import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Tag, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { NavLinkProps } from 'react-router-dom'
import { CircleIcon } from 'components/Icons/Circle'
import { breakpoints } from 'theme/theme'

type SidebarLinkProps = {
  href?: string
  label: string
  children?: React.ReactNode
  to?: NavLinkProps['to']
  isCompact?: boolean
  isNew?: boolean
  isActive?: boolean
} & ButtonProps

export const MainNavLink = memo(
  ({ isCompact, onClick, isNew, label, isActive, ...rest }: SidebarLinkProps) => {
    const [isLargerThan2xl] = useMediaQuery(`(min-width: ${breakpoints['2xl']})`, { ssr: false })
    const translate = useTranslate()
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
      e => (isActive ? e.preventDefault() : onClick?.(e)),
      [isActive, onClick],
    )

    return (
      <Tooltip label={label} isDisabled={isLargerThan2xl || !isCompact} placement='right'>
        <Button
          width='full'
          justifyContent={{ base: isCompact ? 'center' : 'flex-start', '2xl': 'flex-start' }}
          variant='nav-link'
          isActive={isActive}
          onClick={handleClick}
          position='relative'
          fontWeight='medium'
          minWidth={isCompact ? 'auto' : 10}
          iconSpacing={isLargerThan2xl ? 4 : isCompact ? 0 : 4}
          _active={{
            bg: 'transparent',
            color: 'text.base',
            fontWeight: 'bold',
          }}
          _hover={{ bg: 'background.button.secondary.base' }}
          {...rest}
        >
          <Box display={{ base: isCompact ? 'none' : 'flex', '2xl': 'block' }}>{label}</Box>
          {isNew && (
            <>
              <Tag
                ml='auto'
                colorScheme='pink'
                display={{ base: isCompact ? 'none' : 'inline-flex', '2xl': 'inline-flex' }}
              >
                {translate('common.new')}
              </Tag>
              <CircleIcon
                style={{ width: '0.5em', height: '0.5em', color: 'var(--chakra-colors-pink-200)' }}
                right={0}
                top={0}
                position='absolute'
                display={{ base: isCompact ? 'block' : 'none', '2xl': 'none' }}
              />
            </>
          )}
        </Button>
      </Tooltip>
    )
  },
)
