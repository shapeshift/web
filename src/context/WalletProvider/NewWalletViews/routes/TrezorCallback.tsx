import { Center, CircularProgress, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { TrezorIcon } from '@/components/Icons/TrezorIcon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const STORAGE_KEY_REQUEST = 'trezor_deeplink_request'
const STORAGE_KEY_RESPONSE = 'trezor_deeplink_response'

type TrezorDeepLinkRequest = {
  id: string
  method: string
  params: Record<string, unknown>
  timestamp: number
  returnUrl: string
}

type TrezorDeepLinkResponse = {
  id: string
  response: unknown
}

const getPendingRequest = (): TrezorDeepLinkRequest | null => {
  const data = localStorage.getItem(STORAGE_KEY_REQUEST)
  return data ? JSON.parse(data) : null
}

const storeResponse = (response: TrezorDeepLinkResponse): void => {
  localStorage.setItem(STORAGE_KEY_RESPONSE, JSON.stringify(response))
}

export const TrezorCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [status, setStatus] = useState<'processing' | 'pairing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const completePairing = useCallback(async () => {
    setStatus('pairing')
    console.log('[TrezorCallback] Starting wallet pairing...')

    try {
      const adapter = await getAdapter(KeyManager.Trezor)
      if (!adapter) {
        throw new Error('Failed to get Trezor adapter')
      }

      const wallet = await adapter.pairDevice()
      if (!wallet) {
        throw new Error('Failed to pair Trezor device')
      }

      const deviceId = await wallet.getDeviceID()
      console.log('[TrezorCallback] Pairing successful, deviceId:', deviceId)

      walletDispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name: 'Trezor',
          icon: TrezorIcon,
          deviceId,
          connectedType: KeyManager.Trezor,
        },
      })
      walletDispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      localWallet.setLocalWallet({ type: KeyManager.Trezor, deviceId })

      setStatus('success')

      setTimeout(() => {
        navigate('/')
      }, 1500)
    } catch (e: any) {
      console.error('[TrezorCallback] Pairing failed:', e)
      setStatus('error')
      setErrorMessage(e?.message || 'Failed to connect Trezor')
    }
  }, [getAdapter, localWallet, navigate, walletDispatch])

  useEffect(() => {
    const processCallback = async () => {
      const id = searchParams.get('id')
      const responseInHash = searchParams.get('response')

      console.log('[TrezorCallback] Processing callback:', {
        id,
        responseInHash: responseInHash ? `${responseInHash.substring(0, 50)}...` : null,
        fullUrl: window.location.href,
        search: window.location.search,
        hash: window.location.hash,
      })

      // Check for response in hash route params first (/#/trezor/callback?id=x&response=y)
      // Then check window.location.search (before hash)
      const searchBeforeHash = new URLSearchParams(window.location.search)
      const responseInSearch = searchBeforeHash.get('response')

      const response = responseInHash || responseInSearch
      const responseSource = responseInHash
        ? 'hash params'
        : responseInSearch
        ? 'search params'
        : null

      if (response) {
        console.log('[TrezorCallback] Found response in', responseSource)
        const pendingRequest = getPendingRequest()

        if (pendingRequest) {
          try {
            const parsedResponse = JSON.parse(decodeURIComponent(response))
            console.log('[TrezorCallback] Parsed response:', parsedResponse)

            storeResponse({
              id: pendingRequest.id,
              response: parsedResponse,
            })

            // Clean URL
            window.history.replaceState({}, '', window.location.origin + '/#/trezor/callback')

            // Now complete pairing - the patch will find the stored response
            await completePairing()
            return
          } catch (e) {
            console.error('[TrezorCallback] Failed to parse response:', e)
            setStatus('error')
            setErrorMessage('Failed to parse Trezor response')
            return
          }
        } else {
          console.error('[TrezorCallback] No pending request found')
          setStatus('error')
          setErrorMessage('No pending request found. Please try connecting again.')
          return
        }
      }

      // No response found - log full URL for debugging
      console.error('[TrezorCallback] No response parameter found in URL:', window.location.href)
      setStatus('error')
      setErrorMessage('Missing response from Trezor. Please try connecting again.')
    }

    processCallback()
  }, [completePairing, searchParams])

  return (
    <Center height='100vh' py={12}>
      <VStack spacing={4}>
        {status === 'processing' && (
          <>
            <CircularProgress isIndeterminate color='blue.500' />
            <Text>Processing Trezor response...</Text>
          </>
        )}
        {status === 'pairing' && (
          <>
            <CircularProgress isIndeterminate color='blue.500' />
            <Text>Connecting Trezor wallet...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text color='green.500' fontWeight='bold' fontSize='xl'>
              ✓ Trezor Connected!
            </Text>
            <Text>Redirecting to dashboard...</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text color='red.500' fontWeight='bold'>
              Connection Failed
            </Text>
            <Text>{errorMessage}</Text>
            <Text fontSize='xs' color='gray.500' wordBreak='break-all' maxW='90vw' mt={4}>
              URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
            </Text>
            <Text fontSize='xs' color='gray.500' wordBreak='break-all' maxW='90vw' mt={2}>
              Request:{' '}
              {typeof window !== 'undefined'
                ? localStorage.getItem('trezor_deeplink_request') || 'null'
                : 'N/A'}
            </Text>
            <Text fontSize='xs' color='gray.500' wordBreak='break-all' maxW='90vw' mt={2}>
              Response:{' '}
              {typeof window !== 'undefined'
                ? localStorage.getItem('trezor_deeplink_response') || 'null'
                : 'N/A'}
            </Text>
            <Text fontSize='sm' color='gray.500' mt={4}>
              Please close this tab and try again.
            </Text>
          </>
        )}
      </VStack>
    </Center>
  )
}
