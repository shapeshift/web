import { Box, Button, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

const TREZOR_DEEPLINK_HTTPS = 'https://connect.trezor.io/9/deeplink/1/'
const TREZOR_DEEPLINK_PROTOCOL = 'trezorsuite://connect'
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

const storePendingRequest = (request: TrezorDeepLinkRequest): void => {
  localStorage.setItem(STORAGE_KEY_REQUEST, JSON.stringify(request))
}

const getStoredResponse = (): TrezorDeepLinkResponse | null => {
  const data = localStorage.getItem(STORAGE_KEY_RESPONSE)
  return data ? JSON.parse(data) : null
}

const clearStoredResponse = (): void => {
  localStorage.removeItem(STORAGE_KEY_RESPONSE)
}

const buildDeepLinkUrl = (
  baseUrl: string,
  method: string,
  params: Record<string, unknown>,
  callbackUrl: string,
): { url: string; requestId: string } => {
  const requestId = crypto.randomUUID()
  const encodedParams = encodeURIComponent(JSON.stringify(params))
  const callbackWithId = `${callbackUrl}?id=${requestId}`
  const encodedCallback = encodeURIComponent(callbackWithId)

  const url = `${baseUrl}?method=${method}&params=${encodedParams}&callback=${encodedCallback}`
  return { url, requestId }
}

export const TrezorDeepLinkTest = () => {
  const [response, setResponse] = useState<TrezorDeepLinkResponse | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  useEffect(() => {
    const storedResponse = getStoredResponse()
    if (storedResponse) {
      console.log('[TrezorDeepLinkTest] Found stored response:', storedResponse)
      setResponse(storedResponse)
    }
  }, [])

  const initiateDeepLink = useCallback(
    (baseUrl: string, method: string, params: Record<string, unknown>) => {
      const callbackUrl = `${window.location.origin}/#/trezor/callback`
      const { url, requestId } = buildDeepLinkUrl(baseUrl, method, params, callbackUrl)

      console.log('[TrezorDeepLinkTest] Generated URL:', url)
      console.log('[TrezorDeepLinkTest] Request ID:', requestId)

      setGeneratedUrl(url)

      storePendingRequest({
        id: requestId,
        method,
        params,
        timestamp: Date.now(),
        returnUrl: window.location.href,
      })

      window.location.href = url
    },
    [],
  )

  const handleClearResponse = useCallback(() => {
    clearStoredResponse()
    setResponse(null)
  }, [])

  return (
    <Box p={8} maxW='800px' mx='auto'>
      <VStack spacing={6} align='stretch'>
        <Heading size='lg'>Trezor Deep Link Test</Heading>

        <Text>
          This page tests the Trezor deep link protocol. The HTTPS links work on mobile (intercepted
          by Trezor Suite app). The trezorsuite:// protocol links work on desktop (if Trezor Suite
          Desktop is installed and registered the protocol).
        </Text>

        <Box>
          <Heading size='sm' mb={2}>
            Requirements:
          </Heading>
          <Text as='ul' pl={4}>
            <li>Trezor Suite installed (Desktop or Mobile)</li>
            <li>Trezor device connected (USB or Bluetooth for Safe 7)</li>
          </Text>
        </Box>

        <Box>
          <Heading size='sm' mb={2}>
            Desktop (trezorsuite:// protocol)
          </Heading>
          <VStack spacing={2}>
            <Button
              colorScheme='blue'
              onClick={() => initiateDeepLink(TREZOR_DEEPLINK_PROTOCOL, 'getFeatures', {})}
              width='full'
            >
              getFeatures via trezorsuite://
            </Button>
            <Button
              colorScheme='green'
              onClick={() =>
                initiateDeepLink(TREZOR_DEEPLINK_PROTOCOL, 'getPublicKey', {
                  path: "m/44'/60'/0'/0/0",
                  coin: 'eth',
                })
              }
              width='full'
            >
              getPublicKey (ETH) via trezorsuite://
            </Button>
          </VStack>
        </Box>

        <Box>
          <Heading size='sm' mb={2}>
            Mobile (HTTPS deep link)
          </Heading>
          <VStack spacing={2}>
            <Button
              colorScheme='purple'
              onClick={() => initiateDeepLink(TREZOR_DEEPLINK_HTTPS, 'getFeatures', {})}
              width='full'
            >
              getFeatures via HTTPS
            </Button>
            <Button
              colorScheme='teal'
              onClick={() =>
                initiateDeepLink(TREZOR_DEEPLINK_HTTPS, 'getPublicKey', {
                  path: "m/44'/60'/0'/0/0",
                  coin: 'eth',
                })
              }
              width='full'
            >
              getPublicKey (ETH) via HTTPS
            </Button>
          </VStack>
        </Box>

        {generatedUrl && (
          <Box>
            <Heading size='sm' mb={2}>
              Generated URL:
            </Heading>
            <Code p={2} display='block' whiteSpace='pre-wrap' wordBreak='break-all' fontSize='xs'>
              {generatedUrl}
            </Code>
          </Box>
        )}

        {response && (
          <Box>
            <Heading size='sm' mb={2}>
              Stored Response:
            </Heading>
            <Code p={2} display='block' whiteSpace='pre-wrap' wordBreak='break-all' fontSize='xs'>
              {JSON.stringify(response, null, 2)}
            </Code>
            <Button mt={2} size='sm' colorScheme='red' onClick={handleClearResponse}>
              Clear Response
            </Button>
          </Box>
        )}

        <Box borderTop='1px solid' borderColor='gray.600' pt={4}>
          <Text fontSize='sm' color='gray.500'>
            Callback URL: {window.location.origin}/#/trezor/callback
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}
