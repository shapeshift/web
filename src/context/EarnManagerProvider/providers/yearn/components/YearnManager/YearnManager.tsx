import { Center } from '@chakra-ui/layout'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'
import { MemoryRouter, useHistory, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import {
  EarnAction,
  EarnParams,
  EarnQueryParams
} from 'context/EarnManagerProvider/EarnManagerProvider'
import { useQuery } from 'hooks/useQuery/useQuery'

import { YearnVaultApi } from '../../api/api'
import { routes as deposit, YearnDeposit } from './YearnDeposit'
import { YearnWithdraw } from './YearnWithdraw'

export const YearnManager = () => {
  const history = useHistory()
  const params = useParams<EarnParams>()
  const [yearnApi, setYearnApi] = useState<YearnVaultApi | null>(null)
  const adapters = useChainAdapters()
  const query = useQuery<EarnQueryParams>()

  useEffect(() => {
    setYearnApi(
      new YearnVaultApi({
        adapter: adapters.byChain(ChainTypes.Ethereum),
        providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL
      })
    )
  }, [adapters])

  if (!yearnApi)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return params.action === EarnAction.Deposit ? (
    <MemoryRouter initialIndex={0} initialEntries={deposit.map(route => route.path)}>
      <YearnDeposit api={yearnApi} browserHistory={history} query={query} />
    </MemoryRouter>
  ) : (
    <MemoryRouter>
      <YearnWithdraw api={yearnApi} /* browserHistory={history} */ />
    </MemoryRouter>
  )
}
