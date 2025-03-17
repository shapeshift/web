export const clickableLinkSx = {
  position: 'relative',
  userSelect: 'none',
  '&:after': {
    content: '""',
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: '1px',
    borderBottom: '1px dotted',
    borderColor: 'whiteAlpha.500',
  },
  '&:hover': {
    '&:after': {
      borderBottom: 'none',
      height: '1px',
    },
  },
}
