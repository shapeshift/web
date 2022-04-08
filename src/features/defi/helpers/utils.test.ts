import { AssetNamespace } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { chainTypeToAssetNamespace, chainTypeToLabel, chainTypeToMainNetNetworkType } from './utils'

describe('chainTypeToAssetNamespace', () => {
  it('can get namespace from chaintype', () => {
    let result = chainTypeToAssetNamespace(ChainTypes.Cosmos)
    expect(result).toEqual(AssetNamespace.Slip44)

    result = chainTypeToAssetNamespace(ChainTypes.Osmosis)
    expect(result).toEqual(AssetNamespace.Slip44)

    result = chainTypeToAssetNamespace(ChainTypes.Ethereum)
    expect(result).toEqual(AssetNamespace.ERC20)
  })
})

describe('chainTypeToLabel', () => {
  it('can get label from chaintype', () => {
    let result = chainTypeToLabel(ChainTypes.Cosmos)
    expect(result).toEqual('Cosmos')

    result = chainTypeToLabel(ChainTypes.Osmosis)
    expect(result).toEqual('Osmosis')

    result = chainTypeToLabel(ChainTypes.Ethereum)
    expect(result).toEqual('')
  })
})

describe('chainTypeToMainNetNetworkType', () => {
  it('can get main net network type from chaintype', () => {
    let result = chainTypeToMainNetNetworkType(ChainTypes.Cosmos)
    expect(result).toEqual(NetworkTypes.COSMOSHUB_MAINNET)

    result = chainTypeToMainNetNetworkType(ChainTypes.Osmosis)
    expect(result).toEqual(NetworkTypes.OSMOSIS_MAINNET)

    result = chainTypeToMainNetNetworkType(ChainTypes.Ethereum)
    expect(result).toEqual(NetworkTypes.MAINNET)
  })
})
