import type { ComponentWithAs, IconProps, ResponsiveValue, ThemeTypings } from '@chakra-ui/react'
import { Box, Button, Checkbox, Link, useColorModeValue } from '@chakra-ui/react'
import type * as CSS from 'csstype'
import type { AnimationDefinition, MotionStyle } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import type { InterpolationOptions } from 'node-polyglot'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'
import { StreamIcon } from 'components/Icons/Stream'
import { RawText, Text } from 'components/Text'
import { formatSecondsToDuration } from 'lib/utils/time'

const initialProps = { opacity: 0 }
const animateProps = { opacity: 1 }
const exitProps = { opacity: 0, transition: { duration: 0.5 } }
const transitionProps = { delay: 0.2, duration: 0.1 }
const motionStyle: MotionStyle = {
  backgroundColor: 'var(--chakra-colors-blanket)',
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 4,
}

const AcknowledgementOverlay: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <motion.div
      key='overlay'
      style={motionStyle}
      initial={initialProps}
      animate={animateProps}
      exit={exitProps}
      transition={transitionProps}
    >
      {children}
    </motion.div>
  )
}

const popoverVariants = {
  initial: {
    y: '100%',
  },
  animate: {
    y: 0,
    transition: {
      type: 'spring',
      bounce: 0.2,
      duration: 0.55,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

const popoverStyle: MotionStyle = {
  backgroundColor: 'var(--chakra-colors-background-surface-overlay-base)',
  position: 'absolute',
  borderTopLeftRadius: 'var(--chakra-radii-2xl)',
  borderTopRightRadius: 'var(--chakra-radii-2xl)',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 5,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingLeft: '2rem',
  paddingRight: '2rem',
  paddingBottom: '2rem',
  paddingTop: '4rem',
}

type AcknowledgementProps = {
  children: React.ReactNode
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
  position?: ResponsiveValue<CSS.Property.Position>
}

type StreamingAcknowledgementProps = Omit<AcknowledgementProps, 'message'> & {
  estimatedTimeMs: number
}
type ArbitrumAcknowledgementProps = Omit<AcknowledgementProps, 'message'>

const cancelHoverProps = { bg: 'rgba(255, 255, 255, 0.2)' }
const boxBorderRadius = { base: 'none', md: 'xl' }

export const Acknowledgement = ({
  children,
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
  position = 'relative',
}: AcknowledgementProps) => {
  const translate = useTranslate()
  const [isShowing, setIsShowing] = useState(false)

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

  const handleAnimationComplete = useCallback((def: AnimationDefinition) => {
    if (def === 'exit') {
      setIsShowing(false)
    }
  }, [])

  useEffect(() => {
    // enters with overflow: hidden
    // exit after animation complete return to overflow: visible
    if (shouldShowAcknowledgement) {
      setIsShowing(true)
    }
  }, [shouldShowAcknowledgement])

  return (
    <Box
      position={position}
      borderRadius={boxBorderRadius}
      overflow={isShowing ? 'hidden' : 'visible'}
      width={'100%'}
    >
      <AnimatePresence mode='wait' initial={false}>
        {shouldShowAcknowledgement && (
          <AcknowledgementOverlay>
            <motion.div
              layout
              key='message'
              variants={popoverVariants}
              initial='initial'
              animate='animate'
              exit='exit'
              style={popoverStyle}
              onAnimationComplete={handleAnimationComplete}
            >
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
              <Box
                textAlign={'center'}
                maxWidth='100%'
                mb={8}
                fontWeight='medium'
                color='text.subtle'
              >
                <RawText>{message}</RawText>
                {content}
              </Box>
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
            </motion.div>
          </AcknowledgementOverlay>
        )}
      </AnimatePresence>

      {children}
    </Box>
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
