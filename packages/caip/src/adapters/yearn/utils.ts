import { JsonRpcProvider } from '@ethersproject/providers'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Vault, Yearn } from '@yfi/sdk'
import fs from 'fs'
import toLower from 'lodash/toLower'

import { toCAIP2 } from '../../caip2/caip2'
import { toCAIP19 } from './../../caip19/caip19'

// YearnMarketCapService deps
const provider = new JsonRpcProvider(process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL)
const yearnSdk = new Yearn(1, { provider })

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/yearn/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`, JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated Yearn CAIP19 adapter data.')
}

export const fetchData = async () => {
  return yearnSdk.vaults.get()
}

export const parseEthData = (data: Vault[]) => {
  const chain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20

  const result = data.reduce((acc, datum) => {
    const { address } = datum
    const id = address
    const tokenId = toLower(address)
    const caip19 = toCAIP19({ chain, network, contractType, tokenId })
    acc[caip19] = id
    return acc
  }, {} as Record<string, string>)

  return result
}

export const parseData = (d: Vault[]) => {
  const ethMainnet = toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  return { [ethMainnet]: parseEthData(d) }
}
