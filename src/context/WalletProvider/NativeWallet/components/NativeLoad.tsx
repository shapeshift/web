import { ChevronRightIcon, CloseIcon, DeleteIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Flex,
  ModalBody,
  ModalHeader,
  StackDivider,
  Tag,
  VStack
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { IconCircle } from 'components/IconCircle'
import { RawText, Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

import { KeyManager } from '../../config'

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
        <VStack mx={-4} spacing={0}>
          {wallets.map(wallet => {
            return (
              <ButtonGroup
                width='full'
                size='lg'
                py={2}
                height='auto'
                variant='ghost'
                px={0}
                key={wallet.id}
                alignItems='center'
                borderRadius='xl'
                justifyContent='space-between'
                as={Button}
                cursor='pointer'
              >
                <Button
                  justifyContent='space-between'
                  variant='outline'
                  border={0}
                  display='flex'
                  colorScheme='blue'
                  _hover={{ bg: 'transaprent' }}
                  px={4}
                  leftIcon={
                    <IconCircle boxSize={8}>
                      <FaWallet />
                    </IconCircle>
                  }
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <RawText
                    overflow='hidden'
                    fontWeight='medium'
                    textOverflow='ellipsis'
                    maxWidth='190px'
                    fontSize='sm'
                  >
                    {wallet.name}
                  </RawText>
                </Button>
                <Button
                  colorScheme='red'
                  size='xs'
                  variant='ghost-filled'
                  borderRardius='xl'
                  mr={4}
                  onClick={() => handleDelete(wallet)}
                >
                  Forget?
                </Button>
              </ButtonGroup>
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
