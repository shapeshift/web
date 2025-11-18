import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Stack, Text as CText, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../types'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'

const arrowForwardIcon = <ArrowForwardIcon />

type MobileStartProps = {
  onClose: () => void
}

export const MobileStart = ({ onClose: _onClose }: MobileStartProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleCreate = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Create)
  }, [navigate])

  const handleImportClick = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Import)
  }, [navigate])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={2} mb={6} alignItems='flex-start'>
          <Box>
            <CText fontSize='2xl' fontWeight='bold' mb={0}>
              {translate('walletProvider.shapeShift.start.header')}
            </CText>
            <CText color='text.subtle' mb={6}>
              {translate('walletProvider.shapeShift.start.body')}
            </CText>
          </Box>
        </VStack>
        <Stack spacing={4}>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleCreate}
            data-test='wallet-mobile-create-button'
          >
            <Text translation={'walletProvider.shapeShift.start.create'} />
          </Button>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleImportClick}
            data-test='wallet-mobile-import-button'
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
        </Stack>
      </DialogBody>
      <DialogFooter />
    </SlideTransition>
  )
}
