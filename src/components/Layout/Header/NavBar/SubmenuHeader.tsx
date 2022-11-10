import { ArrowBackIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/layout'
import { Flex, IconButton, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'

type ExpandedMenuItemProps = {
  title?: string
  description?: string
  alert?: string
  shouldShowBackClick?: boolean
  onBackClick?: () => void
}

export const SubmenuHeader = ({
  title,
  description,
  shouldShowBackClick = true,
  onBackClick: handleBackClick,
}: ExpandedMenuItemProps) => {
  const { handleBackClick: handleBackClickDefault } = useMenuRoutes()
  const headerColor = useColorModeValue('black', 'white')
  const descriptionTextColor = useColorModeValue('black', 'whiteAlpha.600')

  return (
    <Stack flexDir='column' px={2}>
      <Flex mb={3} justifyContent='space-between' alignItems='center'>
        {shouldShowBackClick && (
          <IconButton
            isRound
            size='sm'
            onClick={handleBackClick ?? handleBackClickDefault}
            aria-label='Go Back'
            icon={<ArrowBackIcon />}
          />
        )}
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
