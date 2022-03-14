import { Button, Heading, HStack, Stack, StackDivider } from '@chakra-ui/react'
import { useHistory } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { slices } from 'state/reducer'
import { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { clearState, store, useAppSelector } from 'state/store'

import { FlagRow } from './FlagRow'

type FlagsPageProps = {
  route?: Route
}

const FlagHeader = () => {
  return (
    <Stack pb={4}>
      <Heading>Flags</Heading>
      <RawText color='gray.500'>Turn on and off flags, by toggling the switch.</RawText>
    </Stack>
  )
}

export const Flags = ({ route }: FlagsPageProps) => {
  const history = useHistory()
  const featureFlags = useAppSelector(selectFeatureFlags)

  const handleReset = async () => {
    try {
      // Delete persisted state
      clearState()
      history.push('/')
    } catch (e) {
      console.error('handleReset: ', e)
    }
  }

  const handleResetPrefs = async () => {
    try {
      store.dispatch(slices.preferences.actions.clear())
    } catch (e) {
      console.error('handleResetPrefs: ', e)
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
        <Button onClick={handleReset}>Reset App</Button>
        <Button onClick={handleResetPrefs}>Reset Flags to Default</Button>
      </HStack>
    </Main>
  )
}
