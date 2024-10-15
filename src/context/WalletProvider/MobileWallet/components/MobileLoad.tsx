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
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { IconCircle } from 'components/IconCircle'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { MobileConfig } from '../config'
import { deleteWallet, getWallet, listWallets } from '../mobileMessageHandlers'
import type { RevocableWallet } from '../RevocableWallet'

type WalletProps = {
  wallet: RevocableWallet
  onSelect: (wallet: RevocableWallet) => void
  onRename: (wallet: RevocableWallet) => void
  onDelete: (wallet: RevocableWallet) => void
}

const walletIcon = (
  <IconCircle boxSize={10}>
    <FaWallet />
  </IconCircle>
)
const editIcon = <EditIcon />
const deleteIcon = <DeleteIcon />

const Wallet = ({ wallet, onSelect, onRename, onDelete }: WalletProps) => {
  const translate = useTranslate()
  const handleSelect = useCallback(() => onSelect(wallet), [onSelect, wallet])
  const handleRename = useCallback(() => onRename(wallet), [onRename, wallet])
  const handleDelete = useCallback(() => onDelete(wallet), [onDelete, wallet])
  const createdTranslation = useMemo(
    (): [string, InterpolationOptions] => [
      'common.created',
      { date: dayjs(wallet.createdAt).fromNow() },
    ],
    [wallet.createdAt],
  )
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
        leftIcon={walletIcon}
        onClick={handleSelect}
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
            color='text.subtle'
            translation={createdTranslation}
          />
        </Box>
      </Button>
      <Box display='flex'>
        <IconButton
          aria-label={translate('common.rename')}
          variant='ghost'
          icon={editIcon}
          onClick={handleRename}
        />
        <IconButton
          aria-label={translate('common.forget')}
          variant='ghost'
          icon={deleteIcon}
          onClick={handleDelete}
        />
      </Box>
    </Row>
  )
}

export const MobileLoad = ({ history }: RouteComponentProps) => {
  const { getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<RevocableWallet[]>([])
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      if (!wallets.length) {
        try {
          const vaults = await listWallets()
          if (!vaults.length) {
            return setError('walletProvider.shapeShift.load.error.noWallet')
          }

          setWallets(vaults)
        } catch (e) {
          console.log(e)
          setWallets([])
        }
      }
    })()
  }, [wallets])

  const handleWalletSelect = useCallback(
    async (item: RevocableWallet) => {
      const adapter = await getAdapter(KeyManager.Mobile)
      const deviceId = item?.id
      if (adapter && deviceId) {
        const { name, icon } = MobileConfig
        try {
          const revoker = await getWallet(deviceId)
          if (!revoker?.mnemonic) throw new Error(`Mobile wallet not found: ${deviceId}`)
          if (!revoker?.id) throw new Error(`Revoker ID not found: ${deviceId}`)

          const wallet = await adapter.pairDevice(revoker.id)
          await wallet?.loadDevice({ mnemonic: revoker.mnemonic })
          if (!(await wallet?.isInitialized())) {
            await wallet?.initialize()
          }
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: item.label },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({
            type: WalletActions.SET_IS_CONNECTED,
            payload: true,
          })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

          localWallet.setLocalWallet({ type: KeyManager.Mobile, deviceId })
          localWallet.setLocalNativeWalletName(item?.label ?? 'label')
        } catch (e) {
          console.log(e)
          setError('walletProvider.shapeShift.load.error.pair')
        }
      } else {
        setError('walletProvider.shapeShift.load.error.pair')
      }
    },
    [dispatch, getAdapter, localWallet],
  )

  const handleDelete = useCallback(
    async (wallet: RevocableWallet) => {
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
          console.log(e)
          setError('walletProvider.shapeShift.load.error.delete')
        }
      }
    },
    [translate],
  )

  const handleRename = useCallback(
    (vault: RevocableWallet) => history.push('/mobile/rename', { vault }),
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
              <Wallet
                key={wallet.id}
                wallet={wallet}
                onSelect={handleWalletSelect}
                onRename={handleRename}
                onDelete={handleDelete}
              />
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
