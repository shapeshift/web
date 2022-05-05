import { ArrowBackIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/layout'
import { Flex, IconButton, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'

type ExpandedMenuItemProps = {
  title?: string
  description?: string
  alert?: string
}

export const SubmenuHeader = ({ title, description }: ExpandedMenuItemProps) => {
  const { handleBackClick } = useMenuRoutes()
  const headerColor = useColorModeValue('black', 'white')
  const descriptionTextColor = useColorModeValue('black', 'whiteAlpha.600')

  return (
    <Stack flexDir='column' mb={3} px={2}>
      <Flex mb={3} justifyContent='space-between' alignItems='center'>
        <IconButton
          isRound
          size='sm'
          onClick={handleBackClick}
          aria-label='Go Back'
          icon={<ArrowBackIcon />}
        />
        <Center fontWeight='bold' color={headerColor} fontSize='sm' flex={1} pr={7}>
          {upperFirst(title)}
        </Center>
      </Flex>
      {description && (
        <Text fontSize='sm' px={1} color={descriptionTextColor}>
          {description}
        </Text>
      )}
    </Stack>
  )
}
