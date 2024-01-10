import { useMemo } from 'react'
import { FaDog } from 'react-icons/fa'
import { Main } from 'components/Layout/Main'
import { ResultsEmpty } from 'components/ResultsEmpty'

import { PoolsHeader } from './components/PoolsHeader'

export const YourPositions = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  const emptyIcon = useMemo(() => <FaDog />, [])
  return (
    <Main headerComponent={headerComponent}>
      <ResultsEmpty
        title='lending.yourLoans.emptyTitle'
        body='lending.yourLoans.emptyBody'
        icon={emptyIcon}
      />
    </Main>
  )
}
