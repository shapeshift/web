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

import { MobileConfig, mobileLogger } from '../config'
import { deleteWallet, getWallet, listWallets } from '../mobileMessageHandlers'
import type { RevocableWallet } from '../RevocableWallet'

const moduleLogger = mobileLogger.child({
  namespace: ['components', 'MobileLoad'],
})

export const MobileLoad = ({ history }: RouteComponentProps) => {
  const { state, dispatch } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<RevocableWallet[]>([])
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      if (!wallets.length) {
        try {
          const vaults = await listWallets()
          moduleLogger.trace({ vaults }, 'Found wallets')
          if (!vaults.length) {
            return setError('walletProvider.shapeShift.load.error.noWallet')
          }

          setWallets(vaults)
        } catch (e) {
          mobileLogger.error(e, 'Error reading list of wallets')
          setWallets([])
        }
      }
    })()
  }, [wallets])

  const handleWalletSelect = async (item: RevocableWallet) => {
    const adapter = state.adapters?.get(KeyManager.Native)
    const deviceId = item?.id
    if (adapter && deviceId) {
      const { name, icon } = MobileConfig
      try {
        const revoker = await getWallet(deviceId)
        if (!revoker?.mnemonic) throw new Error(`Mobile wallet not found: ${deviceId}`)

        const wallet = await adapter.pairDevice(revoker.id)
        await wallet.loadDevice({ mnemonic: revoker.mnemonic })
        if (!(await wallet.isInitialized())) {
          await wallet.initialize()
        }
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId, meta: { label: item.label } },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

        setLocalWalletTypeAndDeviceId(KeyManager.Mobile, deviceId)
        setLocalNativeWalletName(item?.label ?? 'label')
      } catch (e) {
        mobileLogger.error(e, { deviceId }, 'Error loading a wallet')
        setError('walletProvider.shapeShift.load.error.pair')
      }
    } else {
      mobileLogger.warn({ deviceId }, 'Missing adapter or device ID')
      setError('walletProvider.shapeShift.load.error.pair')
    }
  }

  const handleDelete = async (wallet: RevocableWallet) => {
    const result = window.confirm(
      translate('walletProvider.shapeShift.load.confirmForget', {
        wallet: wallet.label ?? wallet.id,
      }),
    )
    if (result && wallet?.id) {
      try {
        await deleteWallet(wallet.id)
        setWallets([])
      } catch (e) {
        mobileLogger.error(e, 'Error deleting a wallet')
        setError('walletProvider.shapeShift.load.error.delete')
      }
    }
  }

  const handleRename = async (vault: RevocableWallet) => {
    history.push('/mobile/rename', { vault })
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
                      {wallet.label}
                    </RawText>
                    <Text
                      fontSize='xs'
                      lineHeight='1.2'
                      color='gray.500'
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
