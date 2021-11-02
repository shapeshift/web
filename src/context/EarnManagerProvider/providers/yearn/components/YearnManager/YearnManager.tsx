import { Center } from '@chakra-ui/layout'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import {
  ManagerAction,
  useEarnActions
} from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'
import { YearnDeposit } from 'context/EarnManagerProvider/providers/yearn/components/YearnManager/YearnDeposit'

import { YearnVaultApi } from '../../api/api'
import { YearnWithdraw } from './YearnWithdraw'

export const YearnManager = () => {
  const { action } = useEarnActions()
  const [yearnApi, setYearnApi] = useState<YearnVaultApi | null>(null)
  const adapters = useChainAdapters()

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

  return action === ManagerAction.Deposit ? (
    <YearnDeposit api={yearnApi} />
  ) : (
    <YearnWithdraw api={yearnApi} />
  )
}
