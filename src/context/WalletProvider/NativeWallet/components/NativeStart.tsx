import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Divider, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

const arrowForwardIcon = <ArrowForwardIcon />

export const NativeStart = ({ history }: RouteComponentProps) => {
  const [hasLocalWallet, setHasLocalWallet] = useStateIfMounted<boolean>(false)

  useEffect(() => {
    ;(async () => {
      try {
        const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
        const localWallets = await Vault.list()
        setHasLocalWallet(localWallets.length > 0)
      } catch (e) {
        console.error(e)
        setHasLocalWallet(false)
      }
    })()
  }, [setHasLocalWallet])

  const handleLoad = useCallback(() => history.push(NativeWalletRoutes.Load), [history])
  const handleCreate = useCallback(() => history.push(NativeWalletRoutes.Create), [history])
  const handleImportClick = useCallback(
    () => history.push(NativeWalletRoutes.ImportSelect),
    [history],
  )

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
            onClick={handleImportClick}
            data-test='wallet-native-import-button'
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
