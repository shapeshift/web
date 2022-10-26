import { ChevronDownIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Stack,
} from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Card } from 'components/Card/Card'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { getLogLevel, saveLogLevel } from 'lib/logger'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['FeatureFlags'] })

export const Debugging = () => {
  const [logLevel, setLogLevel] = useState(getLogLevel())
  const [visitorId, setVisitorId] = useState<string | null>(null)

  const handleCopyClick = async () => {
    try {
      if (!visitorId) throw new Error()
      await navigator.clipboard.writeText(visitorId)
      alert('Visitor ID copied!')
    } catch (e) {
      alert('Something went wrong')
    }
  }

  useEffect(() => {
    const pendoData = window.localStorage.getItem('visitorData')
    if (pendoData) {
      const value = JSON.parse(pendoData)
      setVisitorId(value.visitorId.id)
    }
  }, [])

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
        moduleLogger.error(e, `failed to fetch ${url}`)
      }
    })()
  }, [isLocalhost])

  const handleReloadClick = window.location.reload

  return (
    <Stack my={8} spacing={4} flex={1}>
      <Card>
        <Card.Header>
          <Card.Heading>Debugging</Card.Heading>
        </Card.Header>
        <Card.Body as={Stack}>
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
          <Row alignItems='center'>
            <Row.Label>Log Level</Row.Label>
            <Row.Value>
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                  {logLevel}
                </MenuButton>
                <MenuList>
                  <MenuOptionGroup
                    defaultValue={logLevel}
                    type='radio'
                    onChange={value => {
                      if (typeof value === 'string') saveLogLevel(value)
                      setLogLevel(getLogLevel())
                    }}
                  >
                    <MenuItemOption value='error'>error</MenuItemOption>
                    <MenuItemOption value='warn'>warn</MenuItemOption>
                    <MenuItemOption value='info'>info</MenuItemOption>
                    <MenuItemOption value='debug'>debug</MenuItemOption>
                    <MenuItemOption value='trace'>trace</MenuItemOption>
                    <MenuItemOption value='none'>none</MenuItemOption>
                  </MenuOptionGroup>
                </MenuList>
              </Menu>
            </Row.Value>
          </Row>
          <Row alignItems='center'>
            <Row.Label>Pendo visitor ID</Row.Label>
            <Row.Value display='flex' gap={4} alignItems='center'>
              <RawText>{visitorId}</RawText>
              <IconButton
                aria-label='Copy'
                size='sm'
                icon={<CopyIcon />}
                onClick={handleCopyClick}
              />
            </Row.Value>
          </Row>
        </Card.Body>
        <Card.Footer>
          <Button onClick={handleReloadClick} colorScheme='blue'>
            Reload
          </Button>
        </Card.Footer>
      </Card>
    </Stack>
  )
}
