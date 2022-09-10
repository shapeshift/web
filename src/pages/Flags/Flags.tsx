import { Alert } from '@chakra-ui/alert'
import { AlertIcon, Button, Heading, HStack, Stack, StackDivider } from '@chakra-ui/react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { logger } from 'lib/logger'
import { Debugging } from 'pages/Flags/Debugging'
import { slices } from 'state/reducer'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import type { AppDispatch } from 'state/store'
import { clearState, useAppSelector } from 'state/store'

import { FlagRow } from './FlagRow'
const moduleLogger = logger.child({ namespace: ['Flags'] })

const FlagHeader = () => {
  return (
    <Stack pb={4}>
      <Heading>Flags</Heading>
      <RawText color='red.500' fontStyle='italic'>
        These features are <strong>experimental</strong> and in <strong>active development</strong>.
        <br />
        They may be incomplete and/or non-functional.
        <br />
        <strong>You may irreversibly lose funds - we cannot help you.</strong>
        <br />
        Use at your own risk!
      </RawText>
    </Stack>
  )
}

export const Flags = () => {
  const history = useHistory()
  const dispatch = useDispatch<AppDispatch>()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    try {
      // Delete persisted state
      clearState()
      setError(null)
      history.push('/')
    } catch (e) {
      moduleLogger.error(e, 'handleReset: ')
      setError(String((e as Error)?.message))
    }
  }

  const handleResetPrefs = async () => {
    try {
      dispatch(slices.preferences.actions.clearFeatureFlags())
      setError(null)
    } catch (e) {
      moduleLogger.error(e, 'handleResetPrefs: ')
      setError(String((e as Error)?.message))
    }
  }

  return (
    <Main titleComponent={<FlagHeader />}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
        <Card flex={1}>
          <Card.Header>
            <RawText color='gray.500'>
              Turn on and off flags by toggling the switch then press "Apply" to reset the
              application.
            </RawText>
          </Card.Header>
          <Card.Body>
            <Stack divider={<StackDivider />}>
              {Object.keys(featureFlags).map((flag, idx) => (
                <FlagRow key={idx} flag={flag as keyof FeatureFlags} />
              ))}
            </Stack>
          </Card.Body>
          <Card.Footer>
            <HStack my={4} width='full'>
              <Button onClick={handleApply} colorScheme='blue'>
                Apply
              </Button>
              <Button onClick={handleResetPrefs}>Reset Flags to Default</Button>
            </HStack>
          </Card.Footer>
        </Card>

        <Debugging />
      </Stack>
      {error && (
        <Alert status='error'>
          <AlertIcon />
          <RawText>{error}</RawText>
        </Alert>
      )}
    </Main>
  )
}
