import { Card, Center } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Main } from 'components/Layout/Main'

import { AddLiquidity } from './components/AddLiquitity/AddLiquidity'

type MatchParams = {
  poolOpportunityId?: string
}

export const AddLiquidityPage = () => {
  const { poolOpportunityId } = useParams<MatchParams>()
  const opportunityId = useMemo(
    () => decodeURIComponent(poolOpportunityId ?? ''),
    [poolOpportunityId],
  )

  return (
    <Main>
      <Center>
        <Card width='full' maxWidth='md'>
          <AddLiquidity paramOpportunityId={opportunityId} />
        </Card>
      </Center>
    </Main>
  )
}
