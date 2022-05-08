import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Heading,
  HStack,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Stack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { Card } from 'components/Card/Card'
import { Row } from 'components/Row/Row'
import { getLogLevel, saveLogLevel } from 'lib/logger'

export const Debugging = () => {
  const [logLevel, setLogLevel] = useState(getLogLevel())

  return (
    <Stack my={8} spacing={4}>
      <Heading>Debugging</Heading>
      <Card>
        <Card.Body>
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
                    <MenuItemOption value='error'>Error</MenuItemOption>
                    <MenuItemOption value='warn'>Warning</MenuItemOption>
                    <MenuItemOption value='info'>Info</MenuItemOption>
                    <MenuItemOption value='debug'>Debug</MenuItemOption>
                    <MenuItemOption value='trace'>Trace</MenuItemOption>
                    <MenuItemOption value='none'>None</MenuItemOption>
                  </MenuOptionGroup>
                </MenuList>
              </Menu>
            </Row.Value>
          </Row>
        </Card.Body>
      </Card>

      <HStack width='full'>
        <Button onClick={() => window.location.reload()} colorScheme='blue'>
          Reload
        </Button>
      </HStack>
    </Stack>
  )
}
