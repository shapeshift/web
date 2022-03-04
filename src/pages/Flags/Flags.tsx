import { Heading, Stack, StackDivider } from '@chakra-ui/react'
import { Route } from 'Routes/helpers'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'

import { FlagRow } from './FlagRow'

type FlagsPageProps = {
  route: Route
}

const FlagHeader = () => {
  return <Heading pb={4}>Flags</Heading>
}

const example = ['one', 'two', 'three']

export const Flags = ({ route }: FlagsPageProps) => {
  return (
    <Main route={route} titleComponent={<FlagHeader />}>
      <Card>
        <Card.Body>
          <Stack divider={<StackDivider />}>
            {example.map(flag => (
              <FlagRow flag={flag} />
            ))}
          </Stack>
        </Card.Body>
      </Card>
    </Main>
  )
}
