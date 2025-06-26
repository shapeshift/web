import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { IconButton, SimpleGrid } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'

export const BackButton: React.FC<ButtonProps> = props => {
  const translate = useTranslate()
  return (
    <IconButton
      icon={arrowBackIcon}
      aria-label={translate('common.back')}
      variant='ghost'
      fontSize='xl'
      isRound
      {...props}
    />
  )
}

type WithBackButtonProps = React.PropsWithChildren<{
  onBack?: () => void
}>

const arrowBackIcon = <ArrowBackIcon />

export const WithBackButton: React.FC<WithBackButtonProps> = ({ onBack, children }) => {
  if (!onBack) return <>{children}</>
  return (
    <SimpleGrid gridTemplateColumns='25px 1fr 25px' alignItems='center' mx={-2}>
      <BackButton onClick={onBack} />
      {children}
    </SimpleGrid>
  )
}
