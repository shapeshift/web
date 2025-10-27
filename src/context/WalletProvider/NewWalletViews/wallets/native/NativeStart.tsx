import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { Text } from '@/components/Text'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'

const arrowForwardIcon = <ArrowForwardIcon />

export const NativeStart = () => {
  const navigate = useNavigate()
  const handleCreate = useCallback(() => navigate(NativeWalletRoutes.Create), [navigate])
  const handleImportClick = useCallback(() => navigate(NativeWalletRoutes.ImportSelect), [navigate])
  const handleSavedWalletsClick = useCallback(() => navigate(NativeWalletRoutes.Load), [navigate])

  return (
    <>
      <DialogBody>
        <Text fontWeight='bold' translation={'walletProvider.shapeShift.start.header'} />
        <Text mb={4} color='text.subtle' translation={'walletProvider.shapeShift.start.body'} />
        <Stack mt={6} spacing={4}>
          <Divider />
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleCreate}
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
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleSavedWalletsClick}
          >
            <Text translation={'connectWalletPage.viewSavedWallets'} />
          </Button>
        </Stack>
      </DialogBody>
    </>
  )
}
