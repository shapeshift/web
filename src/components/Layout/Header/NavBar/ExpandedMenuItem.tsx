import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Badge } from '@chakra-ui/layout'
import { MenuItem } from '@chakra-ui/menu'
import type { MenuItemProps } from '@chakra-ui/menu/dist/declarations/src/menu'
import { Link, useColorModeValue } from '@chakra-ui/react'
import type { ThemeTypings } from '@chakra-ui/styled-system'
import type { ColorProps } from '@chakra-ui/styled-system/dist/declarations/src/config/color'
import type { InterpolationOptions } from 'node-polyglot'
import type { CSSProperties } from 'react'
import { RawText, Text } from 'components/Text'

type ExpandedMenuItemProps = {
  label: string | null | [string, number | InterpolationOptions]
  value?: string
  valueDisposition?: 'positive' | 'neutral' | 'negative' | 'info'
  badge?: string
  badgeColor?: ThemeTypings['colorSchemes']
  hasSubmenu?: boolean
  isDisabled?: boolean
  externalUrl?: string
  isOpen?: boolean
} & MenuItemProps

export const ExpandedMenuItem = ({
  label,
  value,
  badge,
  badgeColor = 'grey',
  hasSubmenu = false,
  valueDisposition = 'neutral',
  isDisabled = false,
  externalUrl = undefined,
  isOpen = false,
  ...props
}: ExpandedMenuItemProps) => {
  const blackShade = useColorModeValue('blackAlpha.600', 'whiteAlpha.600')
  const greenShade = useColorModeValue('green.600', 'green.500')
  const redShade = useColorModeValue('red.800', 'red.500')
  const yellowShade = useColorModeValue('yellow.600', 'yellow.200')

  const valueColor: ColorProps['color'] = (() => {
    switch (valueDisposition) {
      case 'positive':
        return greenShade
      case 'negative':
        return redShade
      case 'info':
        return yellowShade
      case 'neutral':
      default:
        return blackShade
    }
  })()

  const disabledStyleOverride: CSSProperties = { cursor: 'auto', opacity: 1 }

  const expandedMenuItem = (
    <MenuItem
      display='flex'
      alignItems='center'
      px={3}
      closeOnSelect={!hasSubmenu}
      isDisabled={isDisabled}
      style={isDisabled ? disabledStyleOverride : undefined}
      {...props}
    >
      <Text flex={1} translation={label} />
      <RawText ml={3} color={valueColor}>
        {value}
      </RawText>
      {badge && (
        <Badge ml={2} p={1} borderRadius='lg' colorScheme={badgeColor} fontWeight='semibold'>
          {badge}
        </Badge>
      )}
      {hasSubmenu &&
        (isOpen ? (
          <ChevronDownIcon color='whiteAlpha.600' ml={3} />
        ) : (
          <ChevronRightIcon color='whiteAlpha.600' ml={3} />
        ))}
      {externalUrl && !isDisabled && <ExternalLinkIcon color='whiteAlpha.600' ml={3} />}
    </MenuItem>
  )

  return externalUrl && !isDisabled ? (
    <Link href={externalUrl} isExternal style={{ textDecoration: 'none' }}>
      {expandedMenuItem}
    </Link>
  ) : (
    expandedMenuItem
  )
}
