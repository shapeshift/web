import type { ComponentWithAs, IconProps, ThemeTypings } from '@chakra-ui/react'
import { Box, Button } from '@chakra-ui/react'
import type { AnimationDefinition, MotionStyle } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'
import { StreamIcon } from 'components/Icons/Stream'
import { RawText, Text } from 'components/Text'

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
  message: string
  onAcknowledge: () => void
  shouldShowAcknowledgement: boolean
  setShouldShowAcknowledgement: (shouldShow: boolean) => void
  colorScheme?: ThemeTypings['colorSchemes']
  buttonTranslation?: string
  icon?: ComponentWithAs<'svg', IconProps>
}

type StreamingAcknowledgementProps = Omit<AcknowledgementProps, 'message'> & {
  estimatedTime: string
  timeUnits?: string
}

const cancelHoverProps = { bg: 'rgba(255, 255, 255, 0.2)' }
const boxBorderRadius = { base: 'none', md: 'xl' }

export const Acknowledgement = ({
  children,
  message,
  onAcknowledge,
  shouldShowAcknowledgement,
  setShouldShowAcknowledgement,
  colorScheme = 'red',
  buttonTranslation,
  icon,
}: AcknowledgementProps) => {
  const translate = useTranslate()
  const [isShowing, setIsShowing] = useState(false)

  const understandHoverProps = useMemo(() => ({ bg: `${colorScheme}.600` }), [colorScheme])

  const handleAcknowledge = useCallback(() => {
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

  const CustomIcon = useMemo(() => icon, [icon])

  return (
    <Box
      position='relative'
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
                <CustomIcon color={`${colorScheme}.500`} boxSize='80px' mb={4} />
              ) : (
                <Box as={FiAlertTriangle} color={`${colorScheme}.500`} size='80px' mb={4} />
              )}
              <Text
                colorScheme={colorScheme}
                translation={'warningAcknowledgement.attention'}
                fontWeight='semibold'
                fontSize='2xl'
              />
              <RawText
                align={'center'}
                maxWidth='90%'
                mb={8}
                fontWeight='medium'
                color='text.subtle'
              >
                {message}
              </RawText>
              <Button
                size='lg'
                mb={2}
                colorScheme={colorScheme}
                width='full'
                onClick={handleAcknowledge}
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
  Acknowledgement({ ...props, colorScheme: 'red' })

export const StreamingAcknowledgement = ({
  estimatedTime,
  timeUnits,
  ...restProps
}: StreamingAcknowledgementProps) => {
  const translate = useTranslate()

  return (
    <Acknowledgement
      {...restProps}
      colorScheme='blue'
      buttonTranslation='common.continue'
      message={translate('streamingAcknowledgement.description', {
        estimatedTime: `${estimatedTime}${timeUnits ?? 's'}`,
      })}
      icon={StreamIcon}
    />
  )
}
