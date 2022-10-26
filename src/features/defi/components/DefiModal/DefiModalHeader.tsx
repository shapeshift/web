import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import { RawText } from 'components/Text'

type DefiModalHeaderProps = {
  title: string
  onBack?: () => void
}

export const DefiModalHeader: React.FC<DefiModalHeaderProps> = ({ title, onBack }) => {
  return (
    <ModalHeader py={2} display='flex' justifyContent='space-between' alignItems='center'>
      {onBack && (
        <IconButton
          fontSize='xl'
          isRound
          size='sm'
          variant='ghost'
          aria-label='Back'
          onClick={onBack}
          icon={<ArrowBackIcon />}
        />
      )}

      <RawText fontSize='md'>{title}</RawText>
      <ModalCloseButton position='static' />
    </ModalHeader>
  )
}
