// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md

import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { fromCAIP2, toCAIP2 } from '../caip2/caip2'

export type CAIP19 = string

export enum AssetNamespace {
  CW20 = 'cw20',
  CW721 = 'cw721',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  Slip44 = 'slip44',
  NATIVE = 'native',
  IBC = 'ibc'
}

export enum AssetReference {
  Bitcoin = 0,
  Ethereum = 60,
  Cosmos = 118
}

type ToCAIP19Args = {
  chain: ChainTypes
  network: NetworkTypes
  contractType?: ContractTypes
  tokenId?: string
  assetNamespace?: AssetNamespace
  assetReference?: string
}

type ToCAIP19 = (args: ToCAIP19Args) => string

export const toCAIP19: ToCAIP19 = ({
  chain,
  network,
  contractType,
  tokenId,
  assetNamespace,
  assetReference
}): string => {
  const caip2 = toCAIP2({ chain, network })

  switch (chain) {
    // TODO: There is no chain-level fungible token standard in Cosmos SDK, but CosmWasm chains have CW20/CW721
    // This should be implemented when we want to support tokens for Cosmos SDK chains
    case ChainTypes.Cosmos:
    case ChainTypes.Osmosis: {
      if (!assetNamespace || !assetReference) {
        return `${caip2}/${AssetNamespace.Slip44}:${AssetReference.Cosmos}`
      }
      switch (assetNamespace) {
        case AssetNamespace.CW20:
        case AssetNamespace.CW721:
        case AssetNamespace.IBC:
        case AssetNamespace.NATIVE:
          return `${caip2}/${assetNamespace}:${assetReference}`
        default: {
          throw new Error(
            `Could not construct CAIP19 chain: ${chain}, network: ${network}, assetNamespace: ${assetNamespace}, assetReference: ${assetReference}`
          )
        }
      }
    }
    case ChainTypes.Ethereum: {
      tokenId = tokenId?.toLowerCase()

      if (contractType) {
        if (!tokenId) {
          throw new Error(`toCAIP19: no tokenId provided with contract type ${contractType}`)
        }
        const shapeShiftToCAIP19Namespace = {
          [ChainTypes.Ethereum]: {
            [ContractTypes.ERC20]: AssetNamespace.ERC20,
            [ContractTypes.ERC721]: AssetNamespace.ERC721
          }
        } as const
        switch (contractType) {
          case ContractTypes.ERC20:
          case ContractTypes.ERC721: {
            const namespace = shapeShiftToCAIP19Namespace[chain][contractType]
            if (!tokenId.startsWith('0x')) {
              throw new Error(`toCAIP19: tokenId must start with 0x: ${tokenId}`)
            }
            if (tokenId.length !== 42) {
              throw new Error(`toCAIP19: tokenId length must be 42, length: ${tokenId.length}`)
            }
            return `${caip2}/${namespace}:${tokenId}`
          }
          default: {
            throw new Error(`toCAIP19: unsupported contractType ${contractType} on chain ${chain}`)
          }
        }
      } else {
        if (tokenId) {
          throw new Error(`toCAIP19: tokenId provided without contract type`)
        }
        return `${caip2}/${AssetNamespace.Slip44}:${AssetReference.Ethereum}`
      }
    }
    case ChainTypes.Bitcoin: {
      return `${caip2}/${AssetNamespace.Slip44}:${AssetReference.Bitcoin}`
    }
    default: {
      throw new Error(`Chain type not supported: ${chain}`)
    }
  }
}

type FromCAIP19Return = {
  chain: ChainTypes
  network: NetworkTypes
  contractType?: ContractTypes
  tokenId?: string
  assetNamespace?: AssetNamespace
  assetReference?: string
}

type FromCAIP19 = (caip19: string) => FromCAIP19Return

export const fromCAIP19: FromCAIP19 = (caip19) => {
  const [caip2, namespaceAndReference] = caip19.split('/')
  if (!(caip2 && namespaceAndReference)) {
    throw new Error(
      `fromCAIP19: error parsing caip19, caip2: ${caip2}, namespaceAndReference: ${namespaceAndReference}`
    )
  }

  const [namespace, referenceString] = namespaceAndReference.split(':')
  if (!(namespace && referenceString)) {
    throw new Error(
      `fromCAIP19: error parsing namespace and reference, namespace: ${namespace}, reference: ${referenceString}`
    )
  }

  const reference = Number(referenceString)

  const { chain, network } = fromCAIP2(caip2)

  switch (chain) {
    case ChainTypes.Bitcoin: {
      switch (namespace) {
        case AssetNamespace.Slip44: {
          switch (reference) {
            case AssetReference.Bitcoin: {
              return { chain, network }
            }
            default: {
              throw new Error(`fromCAIP19: invalid asset reference ${reference} on chain ${chain}`)
            }
          }
        }
        default: {
          throw new Error(`fromCAIP19: invalid asset namespace ${namespace} on chain ${chain}`)
        }
      }
    }
    case ChainTypes.Ethereum: {
      switch (namespace) {
        case AssetNamespace.Slip44: {
          switch (reference) {
            case AssetReference.Ethereum: {
              return { chain, network }
            }
            default: {
              throw new Error(`fromCAIP19: invalid asset reference ${reference} on chain ${chain}`)
            }
          }
        }
        case AssetNamespace.ERC20: {
          const contractType = ContractTypes.ERC20
          const tokenId = referenceString.toLowerCase()
          return { chain, network, contractType, tokenId }
        }
        case AssetNamespace.ERC721: {
          const contractType = ContractTypes.ERC721
          const tokenId = referenceString.toLowerCase()
          return { chain, network, contractType, tokenId }
        }
        default: {
          throw new Error(`fromCAIP19: invalid asset namespace ${namespace} on chain ${chain}`)
        }
      }
    }
    case ChainTypes.Osmosis:
    case ChainTypes.Cosmos: {
      switch (namespace) {
        case AssetNamespace.Slip44: {
          switch (reference) {
            case AssetReference.Cosmos: {
              return { chain, network }
            }
            case AssetReference.Ethereum:
            case AssetReference.Bitcoin:
            default: {
              throw new Error(`fromCAIP19: invalid asset namespace ${namespace} on chain ${chain}`)
            }
          }
        }
        case AssetNamespace.CW20:
          return {
            chain,
            network,
            assetNamespace: AssetNamespace.CW20,
            assetReference: referenceString
          }
        case AssetNamespace.CW721:
          return {
            chain,
            network,
            assetNamespace: AssetNamespace.CW721,
            assetReference: referenceString
          }
        case AssetNamespace.IBC:
          return {
            chain,
            network,
            assetNamespace: AssetNamespace.IBC,
            assetReference: referenceString
          }
        case AssetNamespace.NATIVE:
          return {
            chain,
            network,
            assetNamespace: AssetNamespace.NATIVE,
            assetReference: referenceString
          }
        default: {
          throw new Error(`fromCAIP19: invalid asset namespace ${namespace} on chain ${chain}`)
        }
      }
    }
  }

  throw new Error(`fromCAIP19: error parsing caip19: ${caip19}`)
}
