import { Alert } from '@chakra-ui/alert'
import { AlertIcon, Button, Heading, HStack, Stack, StackDivider } from '@chakra-ui/react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { slices } from 'state/reducer'
import { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { AppDispatch, clearState, useAppSelector } from 'state/store'

import { FlagRow } from './FlagRow'

type FlagsPageProps = {
  route?: Route
}

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

export const Flags = ({ route }: FlagsPageProps) => {
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
    <Main route={route} titleComponent={<FlagHeader />}>
      <Card>
        <Card.Body>
          <Stack divider={<StackDivider />}>
            {Object.keys(featureFlags).map((flag, idx) => (
              <FlagRow key={idx} flag={flag as keyof FeatureFlags} />
            ))}
          </Stack>
        </Card.Body>
      </Card>
      <HStack my={4}>
        <Button onClick={handleApply} colorScheme='blue'>
          Apply
        </Button>
        <Button onClick={handleResetPrefs}>Reset Flags to Default</Button>
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
