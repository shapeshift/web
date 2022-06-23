import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'

const TOKEMAK_STATS_URL = getConfig().REACT_APP_TOKEMAK_STATS_URL
const TOKEMAK_TFOX_POOL_ADDRESS = '0x808d3e6b23516967ceae4f17a5f9038383ed5311'

type TokemakPool = {
  address: string
  liquidityProviderApr: string
}

type TokemakChainData = {
  chainId: string
  pools: TokemakPool[]
}

const foxyApr = (async (): Promise<string | null> => {
  const tokemakDataResponse = await axios.get<{ chains: TokemakChainData[] }>(TOKEMAK_STATS_URL)
  const tokemakData = tokemakDataResponse?.data

  // Tokemak only supports mainnet for now, so we could just access chains[0], but this keeps things more declarative
  const tokemakChainData = tokemakData.chains.find(
    ({ chainId }) => chainId === CHAIN_REFERENCE.EthereumMainnet,
  )

  if (!tokemakChainData?.pools) return null

  const { pools } = tokemakChainData
  const tFoxPool = pools.find(({ address }) => address === TOKEMAK_TFOX_POOL_ADDRESS)
  if (!tFoxPool) return null
  const foxyApr = tFoxPool.liquidityProviderApr

  return foxyApr
})()

export const getFoxyApr = () => foxyApr
