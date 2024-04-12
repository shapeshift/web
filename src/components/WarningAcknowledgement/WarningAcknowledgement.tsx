import { Box, Button } from '@chakra-ui/react'
import type { AnimationDefinition, MotionStyle } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useEffect, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'

const WarningOverlay: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <motion.div
      key='overlay'
      style={{
        backgroundColor: 'var(--chakra-colors-blanket)',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 4,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ delay: 0.2, duration: 0.1 }}
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

type WarningAcknowledgementProps = {
  children: React.ReactNode
  message: string
  onAcknowledge: () => void
  shouldShowWarningAcknowledgement: boolean
  setShouldShowWarningAcknowledgement: (shouldShow: boolean) => void
}

const cancelHoverProps = { bg: 'rgba(255, 255, 255, 0.2)' }
const understandHoverProps = { bg: 'red.600' }
const boxBorderRadius = { base: 'none', md: 'xl' }

export const WarningAcknowledgement = ({
  children,
  message,
  onAcknowledge,
  shouldShowWarningAcknowledgement,
  setShouldShowWarningAcknowledgement,
}: WarningAcknowledgementProps) => {
  const translate = useTranslate()
  const [isShowing, setIsShowing] = useState(false)

  const handleAcknowledge = useCallback(() => {
    setShouldShowWarningAcknowledgement(false)
    onAcknowledge()
  }, [onAcknowledge, setShouldShowWarningAcknowledgement])

  const handleCancel = useCallback(() => {
    setShouldShowWarningAcknowledgement(false)
  }, [setShouldShowWarningAcknowledgement])

  const handleAnimationComplete = useCallback((def: AnimationDefinition) => {
    if (def === 'exit') {
      setIsShowing(false)
    }
  }, [])

  useEffect(() => {
    // enters with overflow: hidden
    // exit after animation complete return to overflow: visible
    if (shouldShowWarningAcknowledgement) {
      setIsShowing(true)
    }
  }, [shouldShowWarningAcknowledgement])

  return (
    <Box
      position='relative'
      borderRadius={boxBorderRadius}
      overflow={isShowing ? 'hidden' : 'visible'}
    >
      <AnimatePresence mode='wait' initial={false}>
        {shouldShowWarningAcknowledgement && (
          <WarningOverlay>
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
              <Box as={FiAlertTriangle} color='red.500' size='80px' mb={4} />
              <Text
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
                colorScheme='red'
                width='full'
                onClick={handleAcknowledge}
                _hover={understandHoverProps}
              >
                <Text translation='warningAcknowledgement.understand' />
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
          </WarningOverlay>
        )}
      </AnimatePresence>

      {children}
    </Box>
  )
}
