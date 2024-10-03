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
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { IconCircle } from 'components/IconCircle'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { NativeConfig } from '../config'

type VaultInfo = {
  id: string
  name: string
  createdAt: number
}

const editIcon = <EditIcon />
const deleteIcon = <DeleteIcon />
const walletButtonLeftIcon = (
  <IconCircle boxSize={10}>
    <FaWallet />
  </IconCircle>
)

export const NativeLoad = ({ history }: RouteComponentProps) => {
  const { state, getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<VaultInfo[]>([])
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
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
    const adapter = await getAdapter(KeyManager.Native)
    const deviceId = item.id
    if (adapter) {
      const { name, icon } = NativeConfig
      try {
        // Remove all provider event listeners from previously connected wallets
        await removeAccountsAndChainListeners()

        const wallet = await adapter.pairDevice(deviceId)
        if (!(await wallet?.isInitialized())) {
          // This will trigger the password modal and the modal will set the wallet on state
          // after the wallet has been decrypted. If we set it now, `getPublicKeys` calls will
          // return null, and we don't have a retry mechanism
          await wallet?.initialize()
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
          dispatch({
            type: WalletActions.SET_IS_CONNECTED,
            payload: { isConnected: true, modalType: state.modalType },
          })
          // The wallet is already initialized so we can close the modal
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        }

        localWallet.setLocalWalletTypeAndDeviceId(KeyManager.Native, deviceId)
        localWallet.setLocalNativeWalletName(item.name)
      } catch (e) {
        setError('walletProvider.shapeShift.load.error.pair')
      }
    } else {
      setError('walletProvider.shapeShift.load.error.pair')
    }
  }

  const handleDelete = useCallback(
    async (wallet: VaultInfo) => {
      const result = window.confirm(
        translate('walletProvider.shapeShift.load.confirmForget', {
          wallet: wallet.name ?? wallet.id,
        }),
      )
      if (result) {
        try {
          const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
          await Vault.delete(wallet.id)
          setWallets([])
        } catch (e) {
          setError('walletProvider.shapeShift.load.error.delete')
        }
      }
    },
    [translate],
  )

  const handleRename = useCallback(
    (wallet: VaultInfo) => history.push(NativeWalletRoutes.Rename, { vault: wallet }),
    [history],
  )

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
                  leftIcon={walletButtonLeftIcon}
                  // we need to pass a local scope arg here, so we need an anonymous function wrapper
                  // eslint-disable-next-line react-memo/require-usememo
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
                      // we need to pass a local scope arg here, so we need an anonymous function wrapper
                      // eslint-disable-next-line react-memo/require-usememo
                      translation={['common.created', { date: dayjs(wallet.createdAt).fromNow() }]}
                    />
                  </Box>
                </Button>
                <Box display='flex'>
                  <IconButton
                    aria-label={translate('common.rename')}
                    variant='ghost'
                    icon={editIcon}
                    // we need to pass a local scope arg here, so we need an anonymous function wrapper
                    // eslint-disable-next-line react-memo/require-usememo
                    onClick={() => handleRename(wallet)}
                  />
                  <IconButton
                    aria-label={translate('common.forget')}
                    variant='ghost'
                    icon={deleteIcon}
                    // we need to pass a local scope arg here, so we need an anonymous function wrapper
                    // eslint-disable-next-line react-memo/require-usememo
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
