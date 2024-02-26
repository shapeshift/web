import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, SimpleGrid } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'

type WithBackButtonProps = React.PropsWithChildren<{
  onBack?: () => void
}>

const arrowBackIcon = <ArrowBackIcon />

export const WithBackButton: React.FC<WithBackButtonProps> = ({ onBack, children }) => {
  const translate = useTranslate()
  if (!onBack) return <>{children}</>
  return (
    <SimpleGrid gridTemplateColumns='25px 1fr 25px' alignItems='center' mx={-2}>
      <IconButton
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        variant='ghost'
        fontSize='xl'
        isRound
        onClick={onBack}
      />
      {children}
    </SimpleGrid>
  )
}
