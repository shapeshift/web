import { ListItem, useColorModeValue } from '@chakra-ui/react'
import React from 'react'
import { RawText } from 'components/Text'

export const ListItemSection: React.FC<{ title: string }> = ({ title }) => {
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  return (
    <ListItem
      tabIndex={-1}
      color='text.subtle'
      px={6}
      py={2}
      borderBottomWidth={1}
      mb={2}
      borderColor={borderColor}
    >
      <RawText variant='sub-text' size='xs' textTransform='uppercase'>
        {title}
      </RawText>
    </ListItem>
  )
}
