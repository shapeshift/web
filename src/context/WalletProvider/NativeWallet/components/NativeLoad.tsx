import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
  VStack
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { IconCircle } from 'components/IconCircle'
import { Row } from 'components/Row/Row'
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
              <Row
                mx={-4}
                py={2}
                alignItems='center'
                justifyContent='space-between'
                variant='btn-ghost'
                colorScheme='blue'
              >
                <Button
                  px={4}
                  variant='unstyled'
                  display='flex'
                  pl={4}
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
                  mr={4}
                  onClick={() => handleDelete(wallet)}
                >
                  <Text translation='common.forget' />
                </Button>
              </Row>
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
