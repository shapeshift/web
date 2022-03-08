import { Button, Heading, Stack, StackDivider } from '@chakra-ui/react'
import localforage from 'localforage'
import { useHistory } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { clearState, useAppSelector } from 'state/store'

import { FeatureFlags } from '../../state/slices/preferencesSlice/preferencesSlice'
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
      <Button onClick={handleReset}>Reset App</Button>
    </Main>
  )
}
