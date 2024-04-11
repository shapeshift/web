import { Box, Button, Center, Flex } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import React, { useCallback } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { RawText, Text } from 'components/Text'

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
  const handleAcknowledge = useCallback(() => {
    setShouldShowWarningAcknowledgement(false)
    onAcknowledge()
  }, [onAcknowledge, setShouldShowWarningAcknowledgement])

  const handleCancel = useCallback(() => {
    setShouldShowWarningAcknowledgement(false)
  }, [setShouldShowWarningAcknowledgement])

  return shouldShowWarningAcknowledgement ? (
    <Box position='relative' borderRadius={boxBorderRadius} overflow='hidden'>
      <Box
        background='rgba(0, 0, 0, 0.5)'
        zIndex={2}
        position='absolute'
        right={0}
        bottom={0}
        width='100%'
        height='100%'
        borderRadius='xl'
      >
        {
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '1rem',
              color: 'white',
              zIndex: 10,
            }}
          >
            <Flex direction={'column'} align={'center'}>
              <Box as={FiAlertTriangle} color='red.500' size='30px' mb={2} />
              <Text
                translation={'warningAcknowledgement.attention'}
                fontWeight='bold'
                fontSize='xl'
              />
              <RawText mb={4}>{message}</RawText>
              <Button
                colorScheme='red'
                onClick={handleAcknowledge}
                size='sm'
                _hover={understandHoverProps}
              >
                <Text translation='warningAcknowledgement.understand' />
              </Button>
              <Button
                variant='outline'
                onClick={handleCancel}
                mr={2}
                size='sm'
                _hover={cancelHoverProps}
              >
                Cancel
              </Button>
            </Flex>
          </motion.div>
        }
      </Box>
      {children}
    </Box>
  ) : (
    <>{children}</>
  )
}
