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
