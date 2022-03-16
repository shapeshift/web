import { ArrowBackIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/layout'
import { Button, Flex } from '@chakra-ui/react'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'

type ExpandedMenuItemProps = {
  title: string | undefined
}

export const SubmenuHeader = ({ title }: ExpandedMenuItemProps) => {
  const { handleBackClick } = useMenuRoutes()
  return (
    <Flex mb={3} ml={3} flexDir='row' justifyContent='space-between' alignItems='center'>
      <Button onClick={handleBackClick} size='sm'>
        <ArrowBackIcon color='lightgrey' />
      </Button>
      <Center fontWeight='bold' color='white' fontSize='sm' flex={1} pr={7}>
        {title}
      </Center>
    </Flex>
  )
}
