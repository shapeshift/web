import { Box, Button } from '@chakra-ui/react'
import type { AnimationDefinition, MotionStyle } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { StreamIcon } from 'components/Icons/Stream'
import { RawText, Text } from 'components/Text'
import { WarningOverlay } from 'components/WarningOverlay/WarningOverlay'

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

type StreamingAcknowledgementProps = {
  children: React.ReactNode
  onAcknowledge: () => void
  shouldShowStreamingAcknowledgement: boolean
  setShouldShowStreamingAcknowledgement: (shouldShow: boolean) => void
  estimatedTime: string
}

const cancelHoverProps = { bg: 'rgba(255, 255, 255, 0.2)' }
const understandHoverProps = { bg: 'blue.600' }
const boxBorderRadius = { base: 'none', md: 'xl' }

export const StreamingAcknowledgement = ({
  children,
  onAcknowledge,
  shouldShowStreamingAcknowledgement,
  setShouldShowStreamingAcknowledgement,
  estimatedTime,
}: StreamingAcknowledgementProps) => {
  const translate = useTranslate()
  const [isShowing, setIsShowing] = useState(false)

  const handleAcknowledge = useCallback(() => {
    setShouldShowStreamingAcknowledgement(false)
    onAcknowledge()
  }, [onAcknowledge, setShouldShowStreamingAcknowledgement])

  const handleCancel = useCallback(() => {
    setShouldShowStreamingAcknowledgement(false)
  }, [setShouldShowStreamingAcknowledgement])

  const handleAnimationComplete = useCallback((def: AnimationDefinition) => {
    if (def === 'exit') {
      setIsShowing(false)
    }
  }, [])

  useEffect(() => {
    // enters with overflow: hidden
    // exit after animation complete return to overflow: visible
    if (shouldShowStreamingAcknowledgement) {
      setIsShowing(true)
    }
  }, [shouldShowStreamingAcknowledgement])

  return (
    <Box
      position='relative'
      borderRadius={boxBorderRadius}
      overflow={isShowing ? 'hidden' : 'visible'}
      width={'100%'}
    >
      <AnimatePresence mode='wait' initial={false}>
        {shouldShowStreamingAcknowledgement && (
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
              <StreamIcon color='blue.500' boxSize='80px' mb={4} />
              <Text
                translation={'streamingAcknowledgement.attention'}
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
                {translate('streamingAcknowledgement.description', { estimatedTime })}
              </RawText>
              <Button
                size='lg'
                mb={2}
                colorScheme='blue'
                width='full'
                onClick={handleAcknowledge}
                _hover={understandHoverProps}
              >
                <Text translation='common.continue' />
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
