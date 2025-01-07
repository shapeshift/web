import type { ComponentWithAs, IconProps, ThemeTypings } from '@chakra-ui/react'
import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
} from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'

export type AcknowledgementProps = {
  content?: JSX.Element
  message: string | JSX.Element
  onAcknowledge: (() => void) | undefined
  shouldShowAcknowledgement: boolean
  setShouldShowAcknowledgement: (shouldShow: boolean) => void
  buttonColorScheme?: ThemeTypings['colorSchemes']
  iconColorScheme?: ThemeTypings['colorSchemes']
  buttonTranslation?: string | [string, InterpolationOptions]
  icon?: ComponentWithAs<'svg', IconProps>
  disableButton?: boolean
}

const cancelHoverProps = { bg: 'rgba(255, 255, 255, 0.2)' }

export const Acknowledgement = ({
  content,
  message,
  onAcknowledge,
  shouldShowAcknowledgement,
  setShouldShowAcknowledgement,
  buttonColorScheme = 'red',
  iconColorScheme = 'red',
  buttonTranslation,
  disableButton,
  icon: CustomIcon,
}: AcknowledgementProps) => {
  const translate = useTranslate()

  const understandHoverProps = useMemo(
    () => ({ bg: `${buttonColorScheme}.600` }),
    [buttonColorScheme],
  )

  const handleAcknowledge = useCallback(() => {
    if (!onAcknowledge) return

    setShouldShowAcknowledgement(false)
    onAcknowledge()
  }, [onAcknowledge, setShouldShowAcknowledgement])

  const handleCancel = useCallback(() => {
    setShouldShowAcknowledgement(false)
  }, [setShouldShowAcknowledgement])

  return (
    <Modal isOpen={shouldShowAcknowledgement} onClose={handleCancel}>
      <ModalOverlay />
      <ModalContent pointerEvents='all'>
        <ModalBody paddingTop='2rem' display='flex' flexDirection='column' alignItems='center'>
          {CustomIcon ? (
            <CustomIcon color={`${iconColorScheme}.500`} boxSize='80px' mb={4} />
          ) : (
            <Box as={FiAlertTriangle} color={`${iconColorScheme}.500`} size='80px' mb={4} />
          )}
          <Text
            translation={'warningAcknowledgement.attention'}
            fontWeight='semibold'
            fontSize='2xl'
          />
          <Box textAlign={'center'} maxWidth='100%' fontWeight='medium' color='text.subtle'>
            <RawText>{message}</RawText>
            {content}
          </Box>
        </ModalBody>

        <ModalFooter display='flex' flexDirection='column' alignItems='center'>
          <Button
            size='lg'
            mb={2}
            colorScheme={buttonColorScheme}
            width='full'
            onClick={handleAcknowledge}
            isDisabled={disableButton}
            _hover={understandHoverProps}
          >
            <Text translation={buttonTranslation ?? 'warningAcknowledgement.understand'} />
          </Button>
          <Button
            size='lg'
            width='full'
            colorScheme='gray'
            onClick={handleCancel}
            _hover={cancelHoverProps}
          >
            {translate('common.cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
