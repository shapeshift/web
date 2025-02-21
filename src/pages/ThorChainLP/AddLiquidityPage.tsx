import { Card, Center } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useParams } from 'react-router'

import { AddLiquidity } from './components/AddLiquidity/AddLiquidity'

import { Main } from '@/components/Layout/Main'

type MatchParams = {
  poolAssetId?: string
  opportunityId?: string
}

export const AddLiquidityPage = () => {
  const params = useParams<MatchParams>()

  const poolAssetId = useMemo(() => params.poolAssetId, [params.poolAssetId])

  const opportunityId = useMemo(
    () => decodeURIComponent(params.opportunityId ?? ''),
    [params.opportunityId],
  )

  return (
    <Main>
      <Center>
        <Card width='full' maxWidth='md'>
          <AddLiquidity poolAssetId={poolAssetId} opportunityId={opportunityId} />
        </Card>
      </Center>
    </Main>
  )
}
