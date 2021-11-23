import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  ModalBody,
  ModalHeader,
  VStack
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

import { KeyManager, SUPPORTED_WALLETS } from '../../config'

type VaultInfo = {
  id: string
  name: string
  createdAt: number
}

export const NativeLoad = () => {
  const { state, dispatch } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<VaultInfo[]>([])
  const translate = useTranslate()

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
              const createdAt = Number(meta?.get('createdAt') ?? null)
              const name = String(meta?.get('name') ?? id)
              return { id, name, createdAt }
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
    const result = window.confirm(
      translate('walletProvider.shapeShift.load.confirmForget', {
        wallet: wallet.name ?? wallet.id
      })
    )
    if (result) {
      try {
        await Vault.delete(wallet.id)
        setWallets([])
      } catch (e) {
        setError('walletProvider.shapeShift.load.error.delete')
      }
    }
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.load.header'} />
      </ModalHeader>
      <ModalBody>
        <VStack mx={-4} spacing={0}>
          {wallets.map((wallet, i) => {
            return (
              <Row
                key={wallet.id}
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
                    <IconCircle boxSize={10}>
                      <FaWallet />
                    </IconCircle>
                  }
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <Box textAlign='left'>
                    <RawText
                      overflow='hidden'
                      fontWeight='medium'
                      textOverflow='ellipsis'
                      maxWidth='290px'
                      lineHeight='1.2'
                      mb={1}
                    >
                      {wallet.name}
                    </RawText>
                    <Text
                      fontSize='sm'
                      lineHeight='1.2'
                      color='gray.500'
                      translation={['common.created', { date: dayjs(wallet.createdAt).fromNow() }]}
                    />
                  </Box>
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
