import { ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Badge } from '@chakra-ui/layout'
import { MenuItem } from '@chakra-ui/menu'
import { MenuItemProps } from '@chakra-ui/menu/dist/declarations/src/menu'
import { Link } from '@chakra-ui/react'
import { ThemeTypings } from '@chakra-ui/styled-system'
import { ColorProps } from '@chakra-ui/styled-system/dist/declarations/src/config/color'
import { CSSProperties } from 'react'
import { RawText } from 'components/Text'

type ExpandedMenuItemProps = {
  label: string | undefined
  value?: string
  valueDisposition?: 'positive' | 'neutral' | 'negative' | 'info'
  badge?: string
  badgeColor?: ThemeTypings['colorSchemes']
  hasSubmenu?: boolean
  isDisabled?: boolean
  externalUrl?: string
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
  ...props
}: ExpandedMenuItemProps) => {
  const valueColor: ColorProps['color'] = (() => {
    switch (valueDisposition) {
      case 'positive':
        return 'green.500'
      case 'negative':
        return 'red.500'
      case 'info':
        return 'yellow.200'
      case 'neutral':
      default:
        return 'whiteAlpha.600'
    }
  })()

  const disabledStyleOverride: CSSProperties = { cursor: 'auto', opacity: 1 }

  const expandedMenuItem = (
    <MenuItem
      display='flex'
      {...props}
      closeOnSelect={!hasSubmenu}
      isDisabled={isDisabled}
      style={isDisabled ? disabledStyleOverride : undefined}
    >
      <RawText flex={1}>{label}</RawText>
      <RawText ml={3} color={valueColor}>
        {value}
      </RawText>
      {badge && (
        <Badge ml={2} p={1} borderRadius='lg' colorScheme={badgeColor} fontWeight='semibold'>
          {badge}
        </Badge>
      )}
      {hasSubmenu && <ChevronRightIcon color='whiteAlpha.600' ml={3} />}
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
