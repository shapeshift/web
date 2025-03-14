export const clickableLinkSx = {
  '&:after': {
    content: '""',
    display: 'block',
    height: '1px',
    borderBottom: '1px dotted',
    borderColor: 'whiteAlpha.500',
    mb: '-4px',
  },
  '&:hover': {
    '&:after': {
      borderBottom: 'none',
      height: '1px',
    },
  },
}
