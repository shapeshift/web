import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'

type DefiModalHeaderProps = {
  title: string
  onBack?: () => void
}

const arrowBackIcon = <ArrowBackIcon />

export const DefiModalHeader: React.FC<DefiModalHeaderProps> = ({ title, onBack }) => {
  const translate = useTranslate()
  return (
    <ModalHeader py={2} display='flex' justifyContent='space-between' alignItems='center'>
      {onBack && (
        <IconButton
          fontSize='xl'
          isRound
          size='sm'
          variant='ghost'
          aria-label={translate('common.back')}
          onClick={onBack}
          icon={arrowBackIcon}
        />
      )}

      <RawText fontSize='md'>{title}</RawText>
      <ModalCloseButton position='static' />
    </ModalHeader>
  )
}
