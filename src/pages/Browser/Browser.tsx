import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Button,
  Heading,
  HStack,
  IconButton,
  Input,
  Stack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaBug } from 'react-icons/fa'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

const BrowserHeader = () => {
  return (
    <Stack pb={4}>
      <Heading>Browser</Heading>
    </Stack>
  )
}

export const Browser = () => {
  const [url, setUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const {
    dispatch,
    state: { browserUrl },
  } = useWallet()

  const formatAndSaveUrl = (url: string) => {
    if (url.startsWith('http') || url.startsWith('https')) return setInputUrl(url)
    setInputUrl(`https://${url}`)
  }

  useEffect(() => {
    const webview: any = document.getElementById('webview')
    if (!webview) return
    webview.autosize = 'on'
    setHasMounted(true)
    webview.addEventListener('did-start-loading', () => {
      setLoading(true)
      setFailedToLoad(false)
    })
    webview.addEventListener('did-stop-loading', () => {
      const webviewUrl = webview.getURL()
      setInputUrl(webviewUrl)
      setLoading(false)
      setFailedToLoad(false)
      dispatch({ type: WalletActions.SET_BROWSER_URL, payload: webviewUrl })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!browserUrl || !hasMounted) return
    if (browserUrl === inputUrl) return
    setUrl(browserUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserUrl, hasMounted])

  useEffect(() => {
    if (loading) {
      setTimeout(() => {
        setLoading(currentLoading => {
          if (currentLoading) {
            setFailedToLoad(true)
            dispatch({ type: WalletActions.SET_BROWSER_URL, payload: null })
            return false
          }
          return currentLoading
        })
      }, 10000)
    }
  }, [dispatch, loading])

  const loadUrl = (e: any) => {
    e.preventDefault()
    setLoading(true)
    setUrl(inputUrl)
  }

  const goBack = () => {
    const webview: any = document.getElementById('webview')
    if (!webview) return
    if (webview.canGoBack()) webview.goBack()
  }

  const goForward = () => {
    const webview: any = document.getElementById('webview')
    if (!webview) return
    if (webview.canGoForward()) webview.goForward()
  }

  const openDevTools = () => {
    const webview: any = document.getElementById('webview')
    if (!webview) return
    webview.openDevTools()
  }

  return (
    <Main titleComponent={<BrowserHeader />} height='full'>
      <Stack direction={{ base: 'column', md: 'column' }} spacing={6} height='full'>
        <form onSubmit={loadUrl}>
          <HStack>
            <Input
              disabled={loading}
              value={inputUrl}
              onChange={e => formatAndSaveUrl(e.target.value)}
            />
            <Button isLoading={loading} type='submit'>
              Load URL
            </Button>
            <IconButton
              aria-label='Go back'
              icon={<ArrowBackIcon />}
              onClick={goBack}
              isLoading={loading}
            />
            <IconButton
              aria-label='Go forward'
              icon={<ArrowForwardIcon />}
              onClick={goForward}
              isLoading={loading}
            />
            <IconButton aria-label='Open developer tools' icon={<FaBug />} onClick={openDevTools} />
          </HStack>
        </form>

        <Card
          height='full'
          flex={1}
          style={
            url === ''
              ? {
                  height: '0px',
                }
              : {}
          }
        >
          <Card.Body height='full'>
            {failedToLoad && (
              <Alert status='error'>
                <AlertIcon />
                This webpage failed to load
              </Alert>
            )}
            <webview
              id='webview'
              src={url}
              style={{
                minHeight: url !== '' ? '60em' : '0px',
              }}
            ></webview>
          </Card.Body>
        </Card>
      </Stack>
    </Main>
  )
}
