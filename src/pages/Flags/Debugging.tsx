import { Button, Card, CardBody, CardFooter, CardHeader, Heading, Stack } from '@chakra-ui/react'
import { getCurrentScope } from '@sentry/react'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { Row } from 'components/Row/Row'
import { showDeveloperModal } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'

export const Debugging = () => {
  type BuildMetadata = {
    headShortCommitHash: string
    latestTag: string
  }

  const [buildMetadata, setBuildMetadata] = useState<BuildMetadata | undefined>()
  const isLocalhost = window.location.hostname === 'localhost'

  useEffect(() => {
    if (isLocalhost) return
    ;(async () => {
      const url = './metadata.json'
      try {
        const { data } = await axios.get<BuildMetadata>(url)
        setBuildMetadata(data)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [isLocalhost])

  const handleReloadClick = window.location.reload

  const handleEnvironmentSwitch = useCallback(() => {
    ;(async () => {
      try {
        await showDeveloperModal()
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  const sentryUserId = useMemo(() => {
    return getCurrentScope().getUser()?.id
  }, [])

  return (
    <Stack my={8} spacing={4} flex={1}>
      <Card>
        <CardHeader>
          <Heading>Debugging</Heading>
        </CardHeader>
        <CardBody as={Stack}>
          {isMobile && (
            <Row alignItems='center'>
              <Row.Label>Mobile environment</Row.Label>
              <Row.Value fontFamily={'monospace'}>
                <Button onClick={handleEnvironmentSwitch}>
                  {window.location.host.split('.')[0]}
                </Button>
              </Row.Value>
            </Row>
          )}
          {buildMetadata && (
            <>
              <Row alignItems='center'>
                <Row.Label>Commit hash</Row.Label>
                <Row.Value fontFamily={'monospace'}>{buildMetadata.headShortCommitHash}</Row.Value>
              </Row>
              <Row alignItems='center'>
                <Row.Label>Latest tag</Row.Label>
                <Row.Value fontFamily={'monospace'}>{buildMetadata.latestTag}</Row.Value>
              </Row>
            </>
          )}
          {sentryUserId && (
            <>
              <Row alignItems='center'>
                <Row.Label>Sentry user ID</Row.Label>
                <Row.Value fontFamily={'monospace'}>{sentryUserId}</Row.Value>
              </Row>
            </>
          )}
        </CardBody>
        <CardFooter>
          <Button onClick={handleReloadClick} colorScheme='blue'>
            Reload
          </Button>
        </CardFooter>
      </Card>
    </Stack>
  )
}
