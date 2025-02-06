import { Box, Button, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { IoIosCheckmarkCircle } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'
import { CarouselDots } from 'components/CarouselDots/CarouselDots'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'

type CreateSuccessProps = {
  onClose: () => void
}

export const CreateSuccess = ({ onClose }: CreateSuccessProps) => {
  const translate = useTranslate()
  const handleViewWallet = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderMiddle>
          <Box minWidth='40px'>
            <CarouselDots length={3} activeIndex={3} />
          </Box>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} alignItems='center' flex={1} justifyContent='center'>
          <Icon as={IoIosCheckmarkCircle} boxSize='50px' color='blue.500' />

          <VStack spacing={2} mb={10}>
            <Text fontSize='xl' fontWeight='bold'>
              {translate('walletProvider.manualBackup.success.title')}
            </Text>
            <Text color='text.subtle' textAlign='center'>
              {translate('walletProvider.manualBackup.success.description')}
            </Text>
          </VStack>
        </VStack>
      </DialogBody>
      <DialogFooter>
        <Button colorScheme='blue' size='lg' width='full' onClick={handleViewWallet}>
          {translate('walletProvider.manualBackup.success.viewWallet')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
