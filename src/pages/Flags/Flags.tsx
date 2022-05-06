import { Alert } from '@chakra-ui/alert'
import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  AlertIcon,
  Button,
  Flex,
  Heading,
  HStack,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Select,
  Stack,
  StackDivider,
  Tag,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { slices } from 'state/reducer'
import { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { AppDispatch, clearState, useAppSelector } from 'state/store'

import { FlagRow } from './FlagRow'

const FlagHeader = () => {
  return (
    <Stack pb={4}>
      <Heading>Flags</Heading>
      <RawText color='red.500' fontStyle='italic'>
        These features are <strong>experimental</strong> and in <strong>active development</strong>.
        They may be incomplete and/or non-functional. Use at your own risk.
      </RawText>
      <RawText color='gray.500'>
        Turn on and off flags by toggling the switch then press "Apply" to reset the application.
      </RawText>
    </Stack>
  )
}

export const Flags = () => {
  const history = useHistory()
  const dispatch = useDispatch<AppDispatch>()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const [error, setError] = useState<string | null>(null)
  const [logLevel, setLogLevel] = useState<string | string[] | undefined>('error')

  const handleApply = async () => {
    try {
      // Delete persisted state
      clearState()
      setError(null)
      history.push('/')
    } catch (e) {
      console.error('handleReset: ', e)
      setError(String((e as Error)?.message))
    }
  }

  const handleResetPrefs = async () => {
    try {
      dispatch(slices.preferences.actions.clearFeatureFlags())
      setError(null)
    } catch (e) {
      console.error('handleResetPrefs: ', e)
      setError(String((e as Error)?.message))
    }
  }

  return (
    <Main titleComponent={<FlagHeader />}>
      <Card>
        <Card.Body>
          <Stack divider={<StackDivider />}>
            {Object.keys(featureFlags).map((flag, idx) => (
              <FlagRow key={idx} flag={flag as keyof FeatureFlags} />
            ))}
          </Stack>
        </Card.Body>
      </Card>

      <HStack my={4} width='full'>
        <Button onClick={handleApply} colorScheme='blue'>
          Apply
        </Button>
        <Button onClick={handleResetPrefs}>Reset Flags to Default</Button>
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            Log Level
            <Tag size='sm' ml={2}>
              {logLevel}
            </Tag>
          </MenuButton>
          <MenuList>
            <MenuOptionGroup
              defaultValue={logLevel}
              type='radio'
              onChange={value => setLogLevel(value)}
            >
              <MenuItemOption value='error'>Error</MenuItemOption>
              <MenuItemOption value='warning'>Warning</MenuItemOption>
              <MenuItemOption value='info'>Info</MenuItemOption>
              <MenuItemOption value='trace'>Trace</MenuItemOption>
              <MenuItemOption value='debug'>Debug</MenuItemOption>
            </MenuOptionGroup>
          </MenuList>
        </Menu>
      </HStack>

      {error && (
        <Alert status='error'>
          <AlertIcon />
          <RawText>{error}</RawText>
        </Alert>
      )}
    </Main>
  )
}
