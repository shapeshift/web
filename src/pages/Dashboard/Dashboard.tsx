import { Main } from 'components/Layout/Main'

import { Portfolio } from './Portfolio'

export type MatchParams = {
  assetId: string
}

export const Dashboard = () => {
  return (
    <Main>
      <Portfolio />
    </Main>
  )
}
