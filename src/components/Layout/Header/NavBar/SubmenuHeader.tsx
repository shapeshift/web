import { ArrowBackIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/layout'
import { Button, Flex, Text } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'

type ExpandedMenuItemProps = {
  title?: string
  description?: string
}

export const SubmenuHeader = ({ title, description }: ExpandedMenuItemProps) => {
  const { handleBackClick } = useMenuRoutes()
  return (
    <Flex flexDir='column' mb={3}>
      <Flex mb={3} justifyContent='space-between' alignItems='center'>
        <Button onClick={handleBackClick} size='sm'>
          <ArrowBackIcon color='lightgrey' />
        </Button>
        <Center fontWeight='bold' color='white' fontSize='sm' flex={1} pr={7}>
          {upperFirst(title)}
        </Center>
      </Flex>
      {description && (
        <Text fontSize='sm' color='whiteAlpha.600'>
          {description}
        </Text>
      )}
    </Flex>
  )
}
