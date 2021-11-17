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

import { KeyManager } from '../../config'

type StoredWallet = {
  id: string
  name: string
}

export const NativeLoad = () => {
  const { state, dispatch } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<StoredWallet[]>([])

  useEffect(() => {
    ;(async () => {
      if (!wallets.length) {
        try {
          const vaultIds = await Vault.list()
          if (!vaultIds.length) {
            return setError('walletProvider.shapeShift.load.error.noWallet')
          }

          const storedWallets: StoredWallet[] = await Promise.all(
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

  const handleWalletSelect = async (item: StoredWallet) => {
    const adapter = state.adapters?.get(KeyManager.Native)
    if (adapter) {
      try {
        const wallet = await adapter.pairDevice(item.id)
        await wallet.initialize()
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        setError('walletProvider.shapeShift.load.error.pair')
      }
    } else {
      setError('walletProvider.shapeShift.load.error.pair')
    }
  }

  const handleDelete = async (wallet: StoredWallet) => {
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
        {/* <CircularProgress /> */}
      </ModalBody>
    </>
  )
}
