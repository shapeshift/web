import { JsonRpcProvider } from '@ethersproject/providers'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Token, Vault, Yearn } from '@yfi/sdk'
import fs from 'fs'
import toLower from 'lodash/toLower'
import uniqBy from 'lodash/uniqBy'

import { toCAIP2 } from '../../caip2/caip2'
import { AssetNamespace, toCAIP19 } from '../../caip19/caip19'

const network = 1 // 1 for mainnet
const provider = new JsonRpcProvider(process.env.REACT_APP_ETHEREUM_NODE_URL)
const yearnSdk = new Yearn(network, { provider, disableAllowlist: true })

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/yearn/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated Yearn CAIP19 adapter data.')
}

export const fetchData = async () => {
  const [vaults, ironBankTokens, zapperTokens, underlyingVaultTokens] = await Promise.all([
    yearnSdk.vaults.get(),
    yearnSdk.ironBank.tokens(),
    yearnSdk.tokens.supported(),
    yearnSdk.vaults.tokens()
  ])
  const tokens = [...vaults, ...ironBankTokens, ...zapperTokens, ...underlyingVaultTokens]
  return uniqBy(tokens, 'address')
}

export const parseEthData = (data: (Token | Vault)[]) => {
  const chain = ChainTypes.Ethereum
  const assetNamespace = AssetNamespace.ERC20

  return data.reduce((acc, datum) => {
    const { address } = datum
    const id = address
    const assetReference = toLower(address)
    const caip19 = toCAIP19({
      chain,
      network: NetworkTypes.MAINNET,
      assetNamespace,
      assetReference
    })
    acc[caip19] = id
    return acc
  }, {} as Record<string, string>)
}

export const parseData = (d: (Token | Vault)[]) => {
  const ethMainnet = toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  return { [ethMainnet]: parseEthData(d) }
}
