import {
  Alert,
  AlertIcon,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Heading,
  HStack,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { slices } from 'state/reducer'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import type { AppDispatch } from 'state/store'
import { clearState, useAppSelector } from 'state/store'

import { Debugging } from './Debugging'
import { FlagRow } from './FlagRow'

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

  const handleApply = () => {
    try {
      // Delete persisted state
      clearState()
      setError(null)
      history.push('/')
    } catch (e) {
      console.error(e)
      setError(String((e as Error)?.message))
    }
  }

  const handleResetPreferences = () => {
    try {
      dispatch(slices.preferences.actions.clearFeatureFlags())
      setError(null)
    } catch (e) {
      console.error(e)
      setError(String((e as Error)?.message))
    }
  }

  return (
    <Main titleComponent={<FlagHeader />}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
        <Card flex={1}>
          <CardHeader>
            <RawText color='text.subtle'>
              Turn on and off flags by toggling the switch then press "Apply" to reset the
              application.
            </RawText>
          </CardHeader>
          <CardBody>
            <Stack divider={<StackDivider />}>
              {Object.keys(featureFlags).map((flag, idx) => (
                <FlagRow key={idx} flag={flag as keyof FeatureFlags} />
              ))}
            </Stack>
          </CardBody>
          <CardFooter>
            <HStack my={4} width='full'>
              <Button onClick={handleApply} colorScheme='blue'>
                Apply
              </Button>
              <Button onClick={handleResetPreferences}>Reset Flags to Default</Button>
            </HStack>
          </CardFooter>
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
