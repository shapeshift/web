import { ArrowBackIcon } from '@chakra-ui/icons'
import type { IconButtonProps } from '@chakra-ui/react'
import { IconButton } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

const arrowBackIcon = <ArrowBackIcon />

type DialogBackButtonProps = Omit<IconButtonProps, 'aria-label'>

export const DialogBackButton: React.FC<DialogBackButtonProps> = props => {
  const translate = useTranslate()
  return (
    <IconButton
      variant='ghost'
      icon={arrowBackIcon}
      fontSize='2xl'
      size='md'
      isRound
      aria-label={translate('common.back')}
      {...props}
    />
  )
}
