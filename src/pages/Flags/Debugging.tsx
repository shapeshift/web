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
import { useEffect, useState } from 'react'
import { Card } from 'components/Card/Card'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { getLogLevel, saveLogLevel } from 'lib/logger'

export const Debugging = () => {
  const [logLevel, setLogLevel] = useState(getLogLevel())
  const [visitorId, setVisitorId] = useState<string | null>(null)

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(visitorId ?? '')
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

  return (
    <Stack my={8} spacing={4} flex={1}>
      <Card>
        <Card.Header>
          <Card.Heading>Debugging</Card.Heading>
        </Card.Header>
        <Card.Body as={Stack}>
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
            <Row.Value>
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
          <Button onClick={() => window.location.reload()} colorScheme='blue'>
            Reload
          </Button>
        </Card.Footer>
      </Card>
    </Stack>
  )
}
