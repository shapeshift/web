// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { fromCAIP2, toCAIP2 } from './../caip2/caip2'

export enum AssetNamespace {
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  Slip44 = 'slip44'
}

export enum AssetReference {
  Bitcoin = 0,
  Ethereum = 60
}

type ToCAIP19Args = {
  chain: ChainTypes
  network: NetworkTypes
  contractType?: ContractTypes
  tokenId?: string
}

type ToCAIP19 = (args: ToCAIP19Args) => string

export const toCAIP19: ToCAIP19 = ({ chain, network, contractType, tokenId }) => {
  const caip2 = toCAIP2({ chain, network })

  switch (chain) {
    case ChainTypes.Ethereum: {
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
  }
}

type FromCAIP19Return = {
  chain: ChainTypes
  network: NetworkTypes
  contractType?: ContractTypes
  tokenId?: string
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
            case AssetReference.Ethereum:
            default: {
              throw new Error(`fromCAIP19: invalid asset reference ${reference} on chain ${chain}`)
            }
          }
        }
        case AssetNamespace.ERC20:
        case AssetNamespace.ERC721:
        default: {
          throw new Error(`fromCAIP19: invalid asset reference ${reference} on chain ${chain}`)
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
            case AssetReference.Bitcoin:
            default: {
              throw new Error(`fromCAIP19: invalid asset reference ${reference} on chain ${chain}`)
            }
          }
        }
        case AssetNamespace.ERC20: {
          const contractType = ContractTypes.ERC20
          const tokenId = referenceString
          return { chain, network, contractType, tokenId }
        }
        case AssetNamespace.ERC721: {
          const contractType = ContractTypes.ERC721
          const tokenId = referenceString
          return { chain, network, contractType, tokenId }
        }
      }
    }
  }

  throw new Error(`fromCAIP19: error parsing caip19: ${caip19}`)
}
