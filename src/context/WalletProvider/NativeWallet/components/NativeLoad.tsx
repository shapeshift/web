import { ChevronRightIcon, DeleteIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Flex,
  ModalBody,
  ModalHeader,
  StackDivider,
  VStack
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect, useState } from 'react'
import { RawText, Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

import { KeyManager, SUPPORTED_WALLETS } from '../../config'

type VaultInfo = {
  id: string
  name: string
}

export const NativeLoad = () => {
  const { state, dispatch } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<VaultInfo[]>([])

  useEffect(() => {
    ;(async () => {
      if (!wallets.length) {
        try {
          const vaultIds = await Vault.list()
          if (!vaultIds.length) {
            return setError('walletProvider.shapeShift.load.error.noWallet')
          }

          const storedWallets: VaultInfo[] = await Promise.all(
            vaultIds.map(async id => {
              const meta = await Vault.meta(id)
              const name = String(meta?.get('name') ?? id)
              return { id, name }
            })
          )

          setWallets(storedWallets)
        } catch (e) {
          console.error('WalletProvider:NativeWallet:Load - Cannot get vault', e)
          setWallets([])
        }
      }
    })()
  }, [wallets])

  const handleWalletSelect = async (item: VaultInfo) => {
    const adapter = state.adapters?.get(KeyManager.Native)
    const deviceId = item.id
    if (adapter) {
      const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
      try {
        const wallet = await adapter.pairDevice(deviceId)
        if (!(await wallet.isInitialized())) {
          // This will trigger the password modal and the modal will set the wallet on state
          // after the wallet has been decrypted. If we set it now, `getPublicKeys` calls will
          // return null, and we don't have a retry mechanism
          await wallet.initialize()
        } else {
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId }
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        }
        // Always close the modal after trying to pair the wallet
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        setError('walletProvider.shapeShift.load.error.pair')
      }
    } else {
      setError('walletProvider.shapeShift.load.error.pair')
    }
  }

  const handleDelete = async (wallet: VaultInfo) => {
    try {
      await Vault.delete(wallet.id)
      setWallets([])
    } catch (e) {
      setError('walletProvider.shapeShift.load.error.delete')
    }
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.load.header'} />
      </ModalHeader>
      <ModalBody>
        <VStack spacing={4} divider={<StackDivider />}>
          {wallets.map(wallet => {
            return (
              <Flex w='full' alignItems='center' justifyContent='space-between' key={wallet.id}>
                <Button
                  mr={2}
                  size='sm'
                  w='full'
                  justifyContent='space-between'
                  rightIcon={<ChevronRightIcon />}
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <RawText overflow='hidden' fontWeight='medium' fontSize='xs'>
                    {wallet.name}
                  </RawText>
                </Button>
                <Button
                  size='sm'
                  textTransform='uppercase'
                  colorScheme='red'
                  onClick={() => handleDelete(wallet)}
                >
                  <DeleteIcon color='white' />
                </Button>
              </Flex>
            )
          })}
          {error && (
            <Alert status='error'>
              <AlertIcon />
              <AlertDescription>
                <Text translation={error} />
              </AlertDescription>
            </Alert>
          )}
        </VStack>
      </ModalBody>
    </>
  )
}
