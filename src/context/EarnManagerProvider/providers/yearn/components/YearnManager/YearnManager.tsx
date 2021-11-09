import { Center } from '@chakra-ui/layout'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'
import { MemoryRouter, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { EarnAction, EarnParams } from 'context/EarnManagerProvider/EarnManagerProvider'

import { YearnVaultApi } from '../../api/api'
import { routes as deposit, YearnDeposit } from './Deposit/YearnDeposit'
import { routes as withdraw, YearnWithdraw } from './Withdraw/YearnWithdraw'

export const YearnManager = () => {
  const params = useParams<EarnParams>()
  const [yearnApi, setYearnApi] = useState<YearnVaultApi | null>(null)
  const adapters = useChainAdapters()

  useEffect(() => {
    ;(async () => {
      try {
        const api = new YearnVaultApi({
          adapter: adapters.byChain(ChainTypes.Ethereum),
          providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL
        })
        await api.initialize()
        setYearnApi(api)
      } catch (error) {
        console.error('YearnManager: error', error)
      }
    })()
  }, [adapters])

  if (!yearnApi)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return params.action === EarnAction.Deposit ? (
    <MemoryRouter key='deposit' initialIndex={0} initialEntries={deposit.map(route => route.path)}>
      <YearnDeposit api={yearnApi} />
    </MemoryRouter>
  ) : (
    <MemoryRouter
      key='withdraw'
      initialIndex={0}
      initialEntries={withdraw.map(route => route.path)}
    >
      <YearnWithdraw api={yearnApi} />
    </MemoryRouter>
  )
}
