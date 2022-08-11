import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  CircularProgressLabel,
  Collapse,
  Divider,
  Flex,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText, Text } from 'components/Text'

import { PairIcons } from './PairIcons'

type Status =
  | 'modals.status.header.pending'
  | 'modals.status.header.success'
  | 'modals.status.header.failed'

type TxStatusProps = {
  loading?: boolean
  onClose(): void
  onContinue?(): void
  statusText: Status
  statusIcon: React.ReactNode
  statusBg?: string
  statusBody?: string
  continueText: string
  pairIcons?: string[]
  children?: React.ReactNode
}

export const TxStatus = ({
  onContinue,
  loading,
  statusText,
  statusIcon,
  pairIcons,
  statusBody,
  continueText,
  statusBg,
  children,
}: TxStatusProps) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const { isOpen, onToggle } = useDisclosure()
  return (
    <Stack width='full' spacing={0} borderColor={borderColor} divider={<Divider />}>
      <Stack textAlign='center' spacing={6} p={6} alignItems='center'>
        {pairIcons ? (
          <Flex position='relative' justifyContent='center' alignItems='center'>
            <Flex
              pl={2}
              borderWidth='1px'
              borderColor={borderColor}
              borderRadius='3xl'
              alignItems='center'
              justifyContent='space-between'
              w='110px'
            >
              {loading ? (
                <CircularProgress size={6} />
              ) : (
                <Circle size={6} bg={statusBg}>
                  {statusIcon}
                </Circle>
              )}
              <PairIcons icons={pairIcons} />
            </Flex>
            <Box position='absolute' transform='scale(1.5)' filter='blur(20px)' opacity='0.5'>
              <PairIcons icons={pairIcons} />
            </Box>
          </Flex>
        ) : (
          <Circle bg={statusBg}>
            <CircularProgress isIndeterminate={loading}>
              <CircularProgressLabel>{statusIcon}</CircularProgressLabel>
            </CircularProgress>
          </Circle>
        )}
        <Stack>
          <Text translation={statusText} fontSize='xl' />
          {statusBody && <RawText color='gray.500'>{statusBody}</RawText>}
        </Stack>
        {onContinue && (
          <Stack width='full'>
            <Button
              size='lg'
              colorScheme='blue'
              data-test='defi-modal-status-continue'
              onClick={onContinue}
            >
              {translate(continueText)}
            </Button>
          </Stack>
        )}
      </Stack>
      <Stack spacing={0}>
        <Button
          justifyContent='space-between'
          onClick={onToggle}
          variant='ghost'
          fontSize='md'
          m={2}
          py={6}
          px={6}
          rightIcon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        >
          {translate(isOpen ? 'common.hideDetails' : 'common.showDetails')}
        </Button>

        <Collapse in={isOpen}>{children}</Collapse>
      </Stack>
    </Stack>
  )
}
