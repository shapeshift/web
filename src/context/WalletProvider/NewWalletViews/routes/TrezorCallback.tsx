import { Center, CircularProgress, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

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

const clearPendingRequest = (): void => {
  localStorage.removeItem(STORAGE_KEY_REQUEST)
}

const storeResponse = (response: TrezorDeepLinkResponse): void => {
  localStorage.setItem(STORAGE_KEY_RESPONSE, JSON.stringify(response))
}

export const TrezorCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('id')
    const responseParam = searchParams.get('response')

    console.log('[TrezorCallback] Received callback with params:', {
      id,
      responseParam: responseParam ? `${responseParam.substring(0, 100)}...` : null,
    })

    if (!id || !responseParam) {
      console.error('[TrezorCallback] Missing id or response parameter')
      setStatus('error')
      setErrorMessage('Missing callback parameters')
      return
    }

    const pendingRequest = getPendingRequest()
    console.log('[TrezorCallback] Pending request:', pendingRequest)

    if (!pendingRequest || pendingRequest.id !== id) {
      console.error('[TrezorCallback] No matching pending request for callback')
      setStatus('error')
      setErrorMessage('No matching pending request')
      return
    }

    try {
      const parsedResponse = JSON.parse(decodeURIComponent(responseParam))
      console.log('[TrezorCallback] Parsed response:', parsedResponse)

      storeResponse({
        id,
        response: parsedResponse,
      })

      clearPendingRequest()
      setStatus('success')

      const returnPath = new URL(pendingRequest.returnUrl).pathname
      console.log('[TrezorCallback] Navigating to:', returnPath)

      setTimeout(() => {
        navigate(returnPath)
      }, 1000)
    } catch (e) {
      console.error('[TrezorCallback] Failed to parse response:', e)
      setStatus('error')
      setErrorMessage('Failed to parse response')
    }
  }, [navigate, searchParams])

  return (
    <Center height='100%' py={12}>
      <VStack spacing={4}>
        {status === 'processing' && (
          <>
            <CircularProgress isIndeterminate color='blue.500' />
            <Text>Processing Trezor response...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text color='green.500' fontWeight='bold'>
              Success!
            </Text>
            <Text>Redirecting back...</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text color='red.500' fontWeight='bold'>
              Error
            </Text>
            <Text>{errorMessage}</Text>
          </>
        )}
      </VStack>
    </Center>
  )
}
