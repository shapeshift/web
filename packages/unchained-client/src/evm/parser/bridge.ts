import type { ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bscChainId,
  ethChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import Web3 from 'web3'

import type { BaseTxMetadata } from '../../types'
import type { SubParser, TxSpecific } from '.'
import type { Tx } from './types'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'bridge'
}

export interface ParserArgs {
  chainId: ChainId
}

// TODO(woodenfurniture): remove this once unchained-client is moved to lib
const httpProviderByChainId = (chainId: ChainId): string | undefined => {
  switch (chainId) {
    case avalancheChainId:
      return process.env.REACT_APP_AVALANCHE_NODE_URL
    case optimismChainId:
      return process.env.REACT_APP_OPTIMISM_NODE_URL
    case bscChainId:
      return process.env.REACT_APP_BNBSMARTCHAIN_NODE_URL
    case polygonChainId:
      return process.env.REACT_APP_POLYGON_NODE_URL
    case ethChainId:
    default:
      return process.env.REACT_APP_ETHEREUM_NODE_URL
  }
}

const _isContract = async (web3: Web3, address: string): Promise<boolean> => {
  // get the code at the address
  const code = await web3.eth.getCode(address)

  // if the code is not '0x', the address is a contract
  return code !== '0x'
}

const isContractCache: Record<string, Promise<boolean>> = {}

const isContract = (web3: Web3, address: string): Promise<boolean> => {
  if (isContractCache[address] !== undefined) {
    return isContractCache[address]
  }

  isContractCache[address] = _isContract(web3, address)

  return isContractCache[address]
}

export class Parser implements SubParser<Tx> {
  private readonly web3: Web3

  constructor({ chainId }: { chainId: ChainId }) {
    const providerUrl = httpProviderByChainId(chainId)
    if (!providerUrl) throw Error('missing http provider url')
    this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl))
  }

  async parse({ from, to, tokenTransfers }: Tx): Promise<TxSpecific | undefined> {
    if (!tokenTransfers || !tokenTransfers.length) {
      return
    }

    const isInteractingWithContract = await isContract(this.web3, to)

    if (!isInteractingWithContract) return

    const lastTokenTransfer = tokenTransfers[tokenTransfers.length - 1]

    const isBridge = from !== lastTokenTransfer.to

    if (!isBridge) return

    return await Promise.resolve({
      data: {
        method: undefined,
        parser: 'bridge',
      },
    })
  }
}
