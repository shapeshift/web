import { mode } from '@chakra-ui/theme-tools'

const parts = ['item', 'command', 'list', 'button', 'groupTitle', 'divider']

function baseStyleList(props: Record<string, any>) {
  return {
    bg: mode(`#fff`, `gray.750`)(props),
    boxShadow: mode(`lg`, `lg`)(props),
    borderColor: mode('gray.100', 'whiteAlpha.100')(props),
    color: 'inherit',
    minW: '3xs',
    py: '2',
    zIndex: 1,
    borderRadius: 'xl',
    borderWidth: '1px',
  }
}

function baseStyleItem(props: Record<string, any>) {
  return {
    py: '0.4rem',
    px: '1rem',
    margin: '0 0.5rem',
    borderRadius: 'xl',
    width: 'auto',
    minHeight: '40px',
    fontWeight: 'medium',
    transitionProperty: 'background',
    transitionDuration: 'ultra-fast',
    transitionTimingFunction: 'ease-in',
    _focus: {
      bg: mode(`gray.100`, `whiteAlpha.100`)(props),
    },
    _active: {
      bg: mode(`gray.200`, `whiteAlpha.200`)(props),
    },
    _expanded: {
      bg: mode(`gray.100`, `whiteAlpha.100`)(props),
    },
    _disabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  }
}

const baseStyleGroupTitle = {
  mx: 4,
  my: 2,
  fontWeight: 'semibold',
  fontSize: 'sm',
}

const baseStyleCommand = {
  opacity: 0.6,
}

const baseStyleDivider = {
  border: 0,
  borderBottom: '1px solid',
  borderColor: 'inherit',
  opacity: 0.3,
}

const baseStyleButton = {
  transitionProperty: 'common',
  transitionDuration: 'normal',
}

const baseStyle = (props: Record<string, any>) => ({
  button: baseStyleButton,
  list: baseStyleList(props),
  item: baseStyleItem(props),
  groupTitle: baseStyleGroupTitle,
  command: baseStyleCommand,
  divider: baseStyleDivider,
})

export const MenuStyle = {
  parts,
  baseStyle,
}
