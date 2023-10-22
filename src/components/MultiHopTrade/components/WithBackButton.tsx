import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, SimpleGrid } from '@chakra-ui/react'
import React from 'react'

type WithBackButtonProps = React.PropsWithChildren<{
  handleBack: () => void
}>

const arrowBackIcon = <ArrowBackIcon />

export const WithBackButton: React.FC<WithBackButtonProps> = ({ handleBack, children }) => {
  return (
    <SimpleGrid gridTemplateColumns='25px 1fr 25px' alignItems='center' mx={-2}>
      <IconButton
        icon={arrowBackIcon}
        aria-label='Back'
        variant='ghost'
        fontSize='xl'
        isRound
        onClick={handleBack}
      />
      {children}
    </SimpleGrid>
  )
}
