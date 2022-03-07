import { Heading, Stack, StackDivider } from '@chakra-ui/react'
import { Route } from 'Routes/helpers'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'

import { FeatureFlags } from '../../state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from '../../state/slices/preferencesSlice/selectors'
import { useAppSelector } from '../../state/store'
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
  const featureFlags = Object.keys(useAppSelector(selectFeatureFlags)) as Array<keyof FeatureFlags>
  return (
    <Main route={route} titleComponent={<FlagHeader />}>
      <Card>
        <Card.Body>
          <Stack divider={<StackDivider />}>
            {featureFlags.map(flag => (
              <FlagRow flag={flag} />
            ))}
          </Stack>
        </Card.Body>
      </Card>
    </Main>
  )
}
