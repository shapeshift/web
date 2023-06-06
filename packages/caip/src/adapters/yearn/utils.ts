import type { Token, Vault } from '@yfi/sdk'
import { Yearn } from '@yfi/sdk'
import { ethers } from 'ethers'
import fs from 'fs'
import toLower from 'lodash/toLower'
import uniqBy from 'lodash/uniqBy'

import { toAssetId } from '../../assetId/assetId'
import { toChainId } from '../../chainId/chainId'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'

const network = 1 // 1 for mainnet
const provider = new ethers.providers.JsonRpcBatchProvider(process.env.REACT_APP_ETHEREUM_NODE_URL)
const yearnSdk = new Yearn(network, { provider })

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/yearn/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated Yearn AssetId adapter data.')
}

export const fetchData = async () => {
  const [vaults, zapperTokens, underlyingVaultTokens] = await Promise.all([
    yearnSdk.vaults.get(),
    yearnSdk.tokens.supported(),
    yearnSdk.vaults.tokens(),
  ])
  const tokens = [...vaults, ...zapperTokens, ...underlyingVaultTokens]
  return uniqBy(tokens, 'address')
}

export const parseEthData = (data: (Token | Vault)[]) => {
  const assetNamespace = 'erc20'
  const chainNamespace = CHAIN_NAMESPACE.Evm
  const chainReference = CHAIN_REFERENCE.EthereumMainnet

  return data.reduce((acc, datum) => {
    const { address } = datum
    const id = address
    const assetReference = toLower(address)
    const assetId = toAssetId({
      chainNamespace,
      chainReference,
      assetNamespace,
      assetReference,
    })
    acc[assetId] = id
    return acc
  }, {} as Record<string, string>)
}

export const parseData = (d: (Token | Vault)[]) => {
  const ethMainnet = toChainId({
    chainNamespace: CHAIN_NAMESPACE.Evm,
    chainReference: CHAIN_REFERENCE.EthereumMainnet,
  })
  return { [ethMainnet]: parseEthData(d) }
}
