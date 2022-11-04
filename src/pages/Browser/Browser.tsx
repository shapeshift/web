import { Button, Heading, HStack, Input, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export type PairedAppProps = {
  addedOn: number
  serviceName: string
  serviceImageUrl: string
  serviceKey: string
  isKeepKeyDesktop?: boolean
}

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
    setHasMounted(true)
    webview.addEventListener('did-start-loading', () => {
      setLoading(true)
    })
    webview.addEventListener('did-stop-loading', () => {
      const webviewUrl = webview.getURL()
      setInputUrl(webviewUrl)
      setLoading(false)
      dispatch({ type: WalletActions.SET_BROWSER_URL, payload: webviewUrl })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const webview: any = document.getElementById('webview')
    if (!webview || !browserUrl || !hasMounted) return
    if (browserUrl === url) return
    setUrl(browserUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserUrl, hasMounted])

  const loadUrl = (e: any) => {
    e.preventDefault()
    setLoading(true)
    setUrl(inputUrl)
  }

  return (
    <Main titleComponent={<BrowserHeader />}>
      <Stack direction={{ base: 'column', md: 'column' }} spacing={6}>
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
          </HStack>
        </form>

        <Card
          flex={1}
          style={
            url === ''
              ? {
                  height: '0px',
                }
              : {}
          }
        >
          <Card.Body>
            <webview
              id='webview'
              src={url}
              style={{
                width: '100%',
                height: url !== '' ? '50em' : '0px',
              }}
            ></webview>
          </Card.Body>
        </Card>
      </Stack>
    </Main>
  )
}
