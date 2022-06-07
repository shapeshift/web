import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import { AxiosError } from 'axios'
import axios from 'axios'
import { useEffect, useState } from 'react'

import { getConfig } from '../config'

const TOKEMAK_STATS_URL = getConfig().REACT_APP_TOKEMAK_STATS_URL
const TOKEMAK_TFOX_POOL_ADDRESS = getConfig().REACT_APP_TOKEMAK_TFOX_POOL_ADDRESS

type TokemakPool = {
  address: string
  liquidityProviderApr: string
}

type TokemakChainData = {
  chainId: string
  pools: TokemakPool[]
}
export const useFoxyApr = () => {
  const [foxyApr, setFoxyApr] = useState<string | null>(null)
  const [error, setError] = useState<AxiosError>()
  const [loaded, setLoaded] = useState<boolean>(false)

  useEffect(() => {
    const loadFoxyAprData = async () => {
      try {
        const response = await axios.get<{ chains: TokemakChainData[] }>(TOKEMAK_STATS_URL)
        const tokemakData = response?.data
        // Tokemak only supports mainnet for now, so we could just access chains[0], but this keeps things more declarative
        const tokemakChainData = tokemakData.chains.find(
          ({ chainId }) => chainId === CHAIN_REFERENCE.EthereumMainnet,
        )

        if (!tokemakChainData?.pools) return

        const { pools } = tokemakChainData
        const tFoxPool = pools.find(({ address }) => address === TOKEMAK_TFOX_POOL_ADDRESS)
        if (!tFoxPool) return
        setFoxyApr(tFoxPool.liquidityProviderApr)
      } catch (e) {
        setError(e as AxiosError)
      } finally {
        setLoaded(true)
      }
    }

    loadFoxyAprData()
  }, [])

  return { foxyApr, error, loaded }
}
