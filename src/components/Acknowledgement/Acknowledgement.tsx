import type { ComponentWithAs, IconProps, ThemeTypings } from '@chakra-ui/react'
import {
  Box,
  Button,
  Checkbox,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  useColorModeValue,
} from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useCallback, useMemo, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'
import { StreamIcon } from 'components/Icons/Stream'
import { RawText, Text } from 'components/Text'
import { formatSecondsToDuration } from 'lib/utils/time'

type AcknowledgementProps = {
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

type StreamingAcknowledgementProps = Omit<AcknowledgementProps, 'message'> & {
  estimatedTimeMs: number
}
type ArbitrumAcknowledgementProps = Omit<AcknowledgementProps, 'message'>

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
      <ModalContent>
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

export const WarningAcknowledgement = (props: AcknowledgementProps) =>
  Acknowledgement({ ...props, buttonColorScheme: 'red', iconColorScheme: 'red' })

export const InfoAcknowledgement = (props: AcknowledgementProps) =>
  Acknowledgement({ ...props, buttonColorScheme: 'blue', iconColorScheme: 'yellow' })

export const StreamingAcknowledgement = ({
  estimatedTimeMs,
  ...restProps
}: StreamingAcknowledgementProps) => {
  const translate = useTranslate()

  return (
    <Acknowledgement
      {...restProps}
      buttonColorScheme='blue'
      buttonTranslation='common.continue'
      message={translate('streamingAcknowledgement.description', {
        estimatedTimeHuman: formatSecondsToDuration(estimatedTimeMs / 1000),
      })}
      icon={StreamIcon}
    />
  )
}

export const ArbitrumBridgeAcknowledgement = (props: ArbitrumAcknowledgementProps) => {
  const translate = useTranslate()
  const [hasAgreed, setHasAgreed] = useState([false, false])

  const isDisabled = useMemo(() => !hasAgreed.every(Boolean), [hasAgreed])

  const handleAgree = useCallback(
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const updatedAgreements = [...hasAgreed]
      updatedAgreements[index] = event.target.checked
      setHasAgreed(updatedAgreements)
    },
    [hasAgreed],
  )

  const checkboxTextColor = useColorModeValue('gray.800', 'gray.50')

  const checkboxes = useMemo(
    () => (
      <Box py={4} textAlign='left' color={checkboxTextColor}>
        <Checkbox onChange={handleAgree(0)} fontWeight='bold' py={2}>
          {translate('bridge.arbitrum.waitCta')}
        </Checkbox>
        <Checkbox onChange={handleAgree(1)} fontWeight='bold' py={2}>
          {translate('bridge.arbitrum.claimCta')}
        </Checkbox>
      </Box>
    ),
    [checkboxTextColor, handleAgree, translate],
  )

  const handleAcknowledge = useMemo(() => {
    if (isDisabled) return

    return props.onAcknowledge
  }, [isDisabled, props])

  const message = useMemo(
    () => (
      <>
        <RawText as='span'>{translate('bridge.arbitrum.waitWarning')}</RawText>{' '}
        <Link
          href='https://docs.arbitrum.io/arbitrum-bridge/quickstart#withdraw-eth-or-erc-20-tokens-from-child-chain-to-parent-chain'
          isExternal
          colorScheme='blue'
          color='blue.500'
        >
          {translate('common.learnMore')}
        </Link>
      </>
    ),
    [translate],
  )

  return (
    <Acknowledgement
      {...props}
      buttonTranslation='common.continue'
      message={message}
      content={checkboxes}
      disableButton={isDisabled}
      onAcknowledge={handleAcknowledge}
    />
  )
}
