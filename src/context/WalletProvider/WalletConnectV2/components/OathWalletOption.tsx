import { CloseIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Link,
  Spinner,
  Stack,
} from '@chakra-ui/react'
import type EthereumProvider from '@walletconnect/ethereum-provider'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { QRCode } from 'react-qrcode-logo'

import { DirectWalletCard } from './DirectWalletCard'

import oathIcon from '@/assets/oath-wallet.svg'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { RawText, Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { WalletOptionRow } from '@/context/WalletProvider/components/WalletOptionRow'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { WalletConnectV2Config } from '@/context/WalletProvider/WalletConnectV2/config'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const oathWalletLink = (uri: string) => `oathwallet://wc?uri=${encodeURIComponent(uri)}`
const closeIcon = <CloseIcon />
const oathLogo = <Image src={oathIcon} alt='' boxSize='24px' borderRadius='md' />

export const OathWalletOption = ({
  isDisabled = false,
  variant = 'row',
}: {
  isDisabled?: boolean
  variant?: 'row' | 'card'
}) => {
  const translate = useTranslate()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const attemptRef = useRef<AbortController | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [uri, setUri] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const close = useCallback(() => {
    attemptRef.current?.abort()
    attemptRef.current = null
    setIsOpen(false)
    setUri(null)
  }, [])
  useEffect(() => () => attemptRef.current?.abort(), [])

  const connect = useCallback(async () => {
    if (attemptRef.current) return
    const attempt = new AbortController()
    attemptRef.current = attempt
    setIsOpen(true)
    setError(false)
    setUri(null)
    try {
      const adapter = await getAdapter(KeyManager.WalletConnectV2)
      if (attempt.signal.aborted) return
      if (!adapter) throw new Error('WalletConnect adapter unavailable')
      const wallet = await adapter.pairDevice({
        signal: attempt.signal,
        onDisplayUri: (value: string) => {
          if (!attempt.signal.aborted) setUri(value)
        },
      })
      if (!wallet) throw new Error('WalletConnect wallet unavailable')
      const deviceId = await wallet.getDeviceID()
      if (attempt.signal.aborted) {
        if (adapter.keyring.wallets[deviceId] === wallet) {
          await adapter.keyring.remove(deviceId)
        } else {
          await wallet.disconnect()
        }
        return
      }
      dispatch({
        type: WalletActions.SET_WCV2_PROVIDER,
        payload: wallet.provider as unknown as EthereumProvider,
      })
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          deviceId,
          connectedType: KeyManager.WalletConnectV2,
          name: WalletConnectV2Config.name,
          icon: WalletConnectV2Config.icon,
        },
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      localWallet.setLocalWallet({
        type: KeyManager.WalletConnectV2,
        deviceId,
      })
      attemptRef.current = null
      setIsOpen(false)
      setUri(null)
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch {
      if (!attempt.signal.aborted) {
        setError(true)
        setUri(null)
      }
    } finally {
      if (attemptRef.current === attempt) attemptRef.current = null
    }
  }, [dispatch, getAdapter, localWallet])

  return (
    <>
      {variant === 'card' ? (
        <DirectWalletCard
          name='Oath Wallet'
          imageUrl={oathIcon}
          onClick={connect}
          isDisabled={isDisabled || isOpen}
        />
      ) : (
        <WalletOptionRow icon={oathLogo} onClick={connect} isDisabled={isDisabled || isOpen}>
          Oath Wallet
        </WalletOptionRow>
      )}
      <Dialog isOpen={isOpen} onClose={close} height='auto' data-testid='oath-connect-dialog'>
        <Flex align='center' justify='space-between' px={6} pt={5} pb={3}>
          <RawText fontSize='lg' fontWeight='bold'>
            Oath Wallet
          </RawText>
          <IconButton
            aria-label={translate('common.close')}
            icon={closeIcon}
            onClick={close}
            variant='ghost'
          />
        </Flex>
        <DialogBody pb={6}>
          <Stack align='center' spacing={4}>
            <Text translation='walletProvider.oath.connectInstructions' textAlign='center' />
            {error ? (
              <>
                <Alert status='error'>
                  <AlertIcon />
                  <Text translation='walletProvider.oath.connectionError' />
                </Alert>
                <Button onClick={connect}>{translate('walletProvider.oath.retry')}</Button>
              </>
            ) : uri ? (
              <>
                <Box
                  bg='white'
                  p={3}
                  borderRadius='lg'
                  role='img'
                  aria-label={translate('walletProvider.oath.qrCode')}
                >
                  <QRCode value={uri} size={240} ecLevel='M' />
                </Box>
                <Button as='a' href={oathWalletLink(uri)} colorScheme='blue'>
                  {translate('walletProvider.oath.openApp')}
                </Button>
              </>
            ) : (
              <Spinner aria-label={translate('common.loadingText')} />
            )}
            <Link href='https://apps.apple.com/app/id6780187283' isExternal>
              <RawText>{translate('walletProvider.oath.download')}</RawText>
            </Link>
          </Stack>
        </DialogBody>
      </Dialog>
    </>
  )
}
