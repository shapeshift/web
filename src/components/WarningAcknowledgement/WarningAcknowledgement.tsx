import { Box, Button, Flex } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import React, { useCallback, useMemo, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { RawText, Text } from 'components/Text'

type WarningAcknowledgementProps = {
  children: React.ReactNode
  message: string
  onAcknowledge: () => void
  shouldShow: boolean
}

export const WarningAcknowledgement = ({
  children,
  message,
  onAcknowledge,
  shouldShow,
}: WarningAcknowledgementProps) => {
  const [show, setShow] = useState(true) // fixme: should be shouldShow

  const handleAcknowledge = useCallback(() => {
    setShow(false)
    onAcknowledge()
  }, [onAcknowledge])

  const handleCancel = useCallback(() => {
    setShow(false)
  }, [])

  const cancelHoverProps = useMemo(
    () => ({
      bg: 'rgba(255, 255, 255, 0.2)',
    }),
    [],
  )

  const understandHoverProps = useMemo(
    () => ({
      bg: 'red.600',
    }),
    [],
  )

  return (
    <Box position='relative'>
      {children}
      {show && (
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
          <Flex alignItems='center' mb={2}>
            <Box as={FiAlertTriangle} color='red.500' size='20px' mr={2} />
            <Text translation={'warningAcknowledgement.attention'} fontWeight='bold' fontSize='lg'>
              Attention!
            </Text>
          </Flex>
          <RawText mb={4}>{message}</RawText>
          <Flex justifyContent='flex-end'>
            <Button
              variant='outline'
              onClick={handleCancel}
              mr={2}
              size='sm'
              _hover={cancelHoverProps}
            >
              Cancel
            </Button>
            <Button
              colorScheme='red'
              onClick={handleAcknowledge}
              size='sm'
              _hover={understandHoverProps}
            >
              <Text translation='warningAcknowledgement.understand' />
            </Button>
          </Flex>
        </motion.div>
      )}
    </Box>
  )
}
