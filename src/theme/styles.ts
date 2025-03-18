export const clickableLinkSx = {
  userSelect: 'none',
  '&:after': {
    content: '""',
    display: 'block',
    height: '1px',
    borderBottom: '1px dotted',
    borderColor: 'whiteAlpha.500',
  },
  '&:hover': {
    '&:after': {
      borderBottom: '1px solid transparent',
    },
  },
}
