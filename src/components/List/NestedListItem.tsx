import type { ListItemProps } from '@chakra-ui/react'
import { ListItem, useColorModeValue } from '@chakra-ui/react'

export const NestedListItem: React.FC<ListItemProps> = props => {
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  return (
    <ListItem
      display='grid'
      pl={{ base: 0, md: '3rem' }}
      position='relative'
      _before={{
        content: '""',
        position: 'absolute',
        top: {
          base: 'auto',
          md: 0,
        },
        bottom: {
          base: '2rem',
          md: 0,
        },
        height: {
          base: '3.25rem',
          md: 'auto',
        },
        left: 'calc(2rem - 1px)',
        display: 'block',
        width: 0,
        borderLeftWidth: 2,
        borderColor,
      }}
      _last={{
        ':before': {
          height: {
            base: '3.25rem',
            md: '1.5rem',
          },
          bottom: {
            base: '2rem',
            md: 'auto',
          },
        },
        '.reward-asset:after': {
          borderBottomLeftRadius: '8px',
        },
      }}
      {...props}
    />
  )
}
