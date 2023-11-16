import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, SimpleGrid } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'

type WithBackButtonProps = React.PropsWithChildren<{
  handleBack: () => void
}>

const arrowBackIcon = <ArrowBackIcon />

export const WithBackButton: React.FC<WithBackButtonProps> = ({ handleBack, children }) => {
  const translate = useTranslate()
  return (
    <SimpleGrid gridTemplateColumns='25px 1fr 25px' alignItems='center' mx={-2}>
      <IconButton
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        variant='ghost'
        fontSize='xl'
        isRound
        onClick={handleBack}
      />
      {children}
    </SimpleGrid>
  )
}
