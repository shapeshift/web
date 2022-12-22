import { Contract } from '@ethersproject/contracts'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import axios from 'axios'

import erc20Abi from './erc20Abi.json'

// TODO(gomes): copied from asset-service which we can't import because of something something circular deps
// remove me after we go Web on MonoRails
type Asset = {
  assetId: AssetId
  chainId: ChainId
  description?: string
  symbol: string
  name: string
  precision: number
  color: string
  icon: string
  explorer: string
  explorerTxLink: string
  explorerAddressLink: string
}

export const getErc20Data = async (
  to: string,
  value: string,
  contractAddress?: string,
): Promise<string> => {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
  return callData || ''
}

// TODO(gomes): can't use asset-service here because of circular deps, remove me after we go Mono on Rails
let _generatedAssetData: Record<AssetId, Asset> | undefined = undefined
export const getGeneratedAssetData = async (): Promise<Record<AssetId, Asset>> => {
  if (_generatedAssetData?.length) return _generatedAssetData

  const { data: maybeGeneratedAssetData } = await axios.get<Record<AssetId, Asset>>(
    'https://raw.githack.com/shapeshift/lib/main/packages/asset-service/src/service/generatedAssetData.json',
  )

  if (!maybeGeneratedAssetData) return {}
  _generatedAssetData = maybeGeneratedAssetData

  return _generatedAssetData
}
