import { useMemo } from 'react'
import { Main } from 'components/Layout/Main'

import { PoolsHeader } from './components/PoolsHeader'

export const AvailablePools = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  return (
    <Main headerComponent={headerComponent}>
      <p>Availale Pools</p>
    </Main>
  )
}
