import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { AssetNamespace, fromCAIP19, toCAIP19 } from './caip19'

describe('caip19', () => {
  describe('toCAIP19', () => {
    it('can make eth caip19 identifier on mainnet', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const result = toCAIP19({ chain, network })
      expect(result).toEqual('eip155:1/slip44:60')
    })

    it('can make eth caip19 identifier on ropsten', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.ETH_ROPSTEN
      const result = toCAIP19({ chain, network })
      expect(result).toEqual('eip155:3/slip44:60')
    })

    it('throws with invalid eth network', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.TESTNET
      expect(() => toCAIP19({ chain, network })).toThrow(
        'toCAIP2: unsupported ethereum network: TESTNET'
      )
    })

    it('can make Cosmos caip19 identifier on CosmosHub mainnet', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const result = toCAIP19({ chain, network })
      expect(result).toEqual('cosmos:cosmoshub-4/slip44:118')
    })

    it('can make Cosmos caip19 identifier on CosmosHub mainnet with slip44 reference', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const result = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: '118'
      })
      expect(result).toEqual('cosmos:cosmoshub-4/slip44:118')
    })

    it('can make Osmosis caip19 identifier on Osmosis mainnet with slip44 reference', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const result = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: '118'
      })
      expect(result).toEqual('cosmos:osmosis-1/slip44:118')
    })

    it('can return ibc asset caip 19 for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.IBC
      const assetReference = '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      const result = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual(
        'cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      )
    })

    it('can return native asset caip 19 for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.NATIVE
      const assetReference = 'uion'
      const result = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('cosmos:osmosis-1/native:uion')
    })

    it('can return cw20 asset caip 19 for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.CW20
      const assetReference = 'canlab'
      const result = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('cosmos:osmosis-1/cw20:canlab')
    })

    it('can return cw721 asset caip 19 for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.CW721
      const assetReference = 'osmosiskitty'
      const result = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('cosmos:osmosis-1/cw721:osmosiskitty')
    })

    it('can make Cosmos caip19 identifier on CosmosHub vega', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_VEGA
      const result = toCAIP19({ chain, network })
      expect(result).toEqual('cosmos:vega-testnet/slip44:118')
    })

    it('throws with invalid Cosmos network', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.TESTNET
      expect(() => toCAIP19({ chain, network })).toThrow(
        'toCAIP2: unsupported cosmos network: TESTNET'
      )
    })

    it('throws with invalid Cosmos slip44 reference', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const assetNamespace = AssetNamespace.Slip44
      expect(() => toCAIP19({ chain, network, assetNamespace, assetReference: 'bad' })).toThrow(
        'Could not construct CAIP19'
      )
    })

    it('throws with invalid btc network', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.ETH_ROPSTEN
      expect(() => toCAIP19({ chain, network })).toThrow(
        'toCAIP2: unsupported bitcoin network: ETH_ROPSTEN'
      )
    })

    it('can make FOX caip19 identifier on mainnet', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const result = toCAIP19({ chain, network, contractType, tokenId })
      expect(result).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can make FOX caip19 identifier on ropsten', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.ETH_ROPSTEN
      const contractType = ContractTypes.ERC20
      const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const result = toCAIP19({ chain, network, contractType, tokenId })
      expect(result).toEqual('eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('throws with invalid tokenId length', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = '0xfoo'
      expect(() => toCAIP19({ chain, network, contractType, tokenId })).toThrow(
        'toCAIP19: tokenId length must be 42, length: 5'
      )
    })

    it('throws with no tokenId string', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = ''
      expect(() => toCAIP19({ chain, network, contractType, tokenId })).toThrow(
        'toCAIP19: no tokenId provided with contract type ERC20'
      )
    })

    it('throws with invalid tokenId string', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = 'gm'
      expect(() => toCAIP19({ chain, network, contractType, tokenId })).toThrow(
        'toCAIP19: tokenId must start with 0x: gm'
      )
    })

    it('throws if tokenId provided without contract type', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const tokenId = 'gm'
      expect(() => toCAIP19({ chain, network, tokenId })).toThrow(
        'toCAIP19: tokenId provided without contract type'
      )
    })

    it('can make bitcoin caip19 on mainnet', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const result = toCAIP19({ chain, network })
      expect(result).toEqual('bip122:000000000019d6689c085ae165831e93/slip44:0')
    })

    it('can make bitcoin caip19 on testnet', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.TESTNET
      const result = toCAIP19({ chain, network })
      expect(result).toEqual('bip122:000000000933ea01ad0ee984209779ba/slip44:0')
    })
  })

  describe('fromCAIP19', () => {
    it('can return chain, network from eth caip19 on mainnet', () => {
      const caip19 = 'eip155:1/slip44:60'
      const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
      expect(contractType).toBeUndefined()
      expect(tokenId).toBeUndefined()
    })

    it('can return chain, network from eth caip19 on ropsten', () => {
      const caip19 = 'eip155:3/slip44:60'
      const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
      expect(contractType).toBeUndefined()
      expect(tokenId).toBeUndefined()
    })

    it('can return chain, network from bitcoin caip19 on mainnet', () => {
      const caip19 = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
      const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.MAINNET)
      expect(contractType).toBeUndefined()
      expect(tokenId).toBeUndefined()
    })

    it('can return chain, network from bitcoin caip19 on testnet', () => {
      const caip19 = 'bip122:000000000933ea01ad0ee984209779ba/slip44:0'
      const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.TESTNET)
      expect(contractType).toBeUndefined()
      expect(tokenId).toBeUndefined()
    })

    it('can return chain, network, contractType, tokenId from FOX caip19 identifier on mainnet', () => {
      const caip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
      expect(contractType).toEqual(ContractTypes.ERC20)
      expect(tokenId).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can return chain, network, contractType, tokenId from FOX caip19 identifier on ropsten', () => {
      const caip19 = 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
      expect(contractType).toEqual(ContractTypes.ERC20)
      expect(tokenId).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can parse a cosmoshub native token', () => {
      const caip19 = 'cosmos:cosmoshub-4/slip44:118'
      const { chain, network, assetNamespace, assetReference } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Cosmos)
      expect(network).toEqual(NetworkTypes.COSMOSHUB_MAINNET)
      expect(assetNamespace).toBeUndefined()
      expect(assetReference).toBeUndefined()
    })

    it('can parse a osmosis native token', () => {
      const caip19 = 'cosmos:osmosis-1/slip44:118'
      const { chain, network, assetNamespace, assetReference } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toBeUndefined()
      expect(assetReference).toBeUndefined()
    })

    it('can parse a osmosis ibc token', () => {
      const caip19 =
        'cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      const { chain, network, assetNamespace, assetReference } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.IBC)
      expect(assetReference).toEqual(
        '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      )
    })

    it('can parse a osmosis cw20 token', () => {
      const caip19 = 'cosmos:osmosis-1/cw20:canlab'
      const { chain, network, assetNamespace, assetReference } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.CW20)
      expect(assetReference).toEqual('canlab')
    })

    it('can parse a osmosis cw721 token', () => {
      const caip19 = 'cosmos:osmosis-1/cw721:osmokitty'
      const { chain, network, assetNamespace, assetReference } = fromCAIP19(caip19)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.CW721)
      expect(assetReference).toEqual('osmokitty')
    })

    it('errors for an invalid caip19 format', () => {
      expect(() => fromCAIP19('invalid')).toThrow(
        'fromCAIP19: error parsing caip19, caip2: invalid, namespaceAndReference: undefined'
      )
    })

    it('errors for invalid chaintype', () => {
      expect(() => fromCAIP19('invalid:cosmoshub-4/slip44:118')).toThrow(
        'fromCAIP19: unsupported chain: invalid'
      )
    })

    it('errors for invalid network type', () => {
      expect(() => fromCAIP19('cosmos:invalid/slip44:118')).toThrow(
        'fromCAIP19: unsupported cosmos network: invalid'
      )
    })
    it('errors for invalid osmosis asset namespace', () => {
      expect(() => fromCAIP19('cosmos:osmosis-1/invalid:118')).toThrow(
        'fromCAIP19: invalid asset namespace invalid on chain osmosis'
      )
    })
  })
})
