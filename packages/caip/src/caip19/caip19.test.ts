import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { fromCAIP19, toCAIP19 } from './caip19'

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
  })
})
