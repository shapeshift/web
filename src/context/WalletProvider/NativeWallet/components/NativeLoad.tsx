import { DeleteIcon, EditIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  IconButton,
  ModalBody,
  ModalHeader,
  VStack,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { IconCircle } from 'components/IconCircle'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import {
  setLocalNativeWalletName,
  setLocalWalletTypeAndDeviceId,
} from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { NativeConfig } from '../config'

type VaultInfo = {
  id: string
  name: string
  createdAt: number
}

export const NativeLoad = ({ history }: RouteComponentProps) => {
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
            }),
          )

          setWallets(storedWallets)
        } catch (e) {
          console.error(e)
          setWallets([])
        }
      }
    })()
  }, [wallets])

  const handleWalletSelect = async (item: VaultInfo) => {
    const adapters = state.adapters?.get(KeyManager.Native)
    const deviceId = item.id
    if (adapters?.length) {
      const { name, icon } = NativeConfig
      try {
        const wallet = await adapters[0].pairDevice(deviceId)
        if (!(await wallet.isInitialized())) {
          // This will trigger the password modal and the modal will set the wallet on state
          // after the wallet has been decrypted. If we set it now, `getPublicKeys` calls will
          // return null, and we don't have a retry mechanism
          await wallet.initialize()
        } else {
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: item.name },
              connectedType: KeyManager.Native,
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          // The wallet is already initialized so we can close the modal
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        }

        setLocalWalletTypeAndDeviceId(KeyManager.Native, deviceId)
        setLocalNativeWalletName(item.name)
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
        wallet: wallet.name ?? wallet.id,
      }),
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

  const handleRename = (wallet: VaultInfo) => history.push('/native/rename', { vault: wallet })

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
                key={wallet.id}
                mx={-4}
                py={2}
                alignItems='center'
                justifyContent='space-between'
                variant='btn-ghost'
                colorScheme='blue'
                data-test='native-saved-wallet'
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
                  data-test='native-saved-wallet-button'
                >
                  <Box textAlign='left'>
                    <RawText
                      fontWeight='medium'
                      maxWidth='260px'
                      lineHeight='1.2'
                      mb={1}
                      noOfLines={1}
                      data-test='native-saved-wallet-name'
                    >
                      {wallet.name}
                    </RawText>
                    <Text
                      fontSize='xs'
                      lineHeight='1.2'
                      color='text.subtle'
                      translation={['common.created', { date: dayjs(wallet.createdAt).fromNow() }]}
                    />
                  </Box>
                </Button>
                <Box display='flex'>
                  <IconButton
                    aria-label={translate('common.rename')}
                    variant='ghost'
                    icon={<EditIcon />}
                    onClick={() => handleRename(wallet)}
                  />
                  <IconButton
                    aria-label={translate('common.forget')}
                    variant='ghost'
                    icon={<DeleteIcon />}
                    onClick={() => handleDelete(wallet)}
                  />
                </Box>
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
