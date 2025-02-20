import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'

import { getWalletCount } from '../mobileMessageHandlers'

const arrowForwardIcon = <ArrowForwardIcon />

export const MobileStart = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      try {
        const localWallets = await getWalletCount()
        setHasLocalWallet(localWallets > 0)
      } catch (e) {
        console.log(e)
        setHasLocalWallet(false)
      }
    })()
  }, [setHasLocalWallet])

  const handleLoad = useCallback(() => history.push('/mobile/load'), [history])
  const handleCreate = useCallback(() => history.push('/mobile/create'), [history])
  const handleImport = useCallback(() => history.push('/mobile/import'), [history])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.start.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle' translation={'walletProvider.shapeShift.start.body'} />
        <Stack mt={6} spacing={4}>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            isDisabled={!hasLocalWallet}
            onClick={handleLoad}
            data-test='wallet-native-load-button'
          >
            <Text translation={'walletProvider.shapeShift.start.load'} />
          </Button>
          <Divider />
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleCreate}
            data-test='wallet-native-create-button'
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
            onClick={handleImport}
            data-test='wallet-native-import-button'
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
