import type {
  PathDescription,
  TronAccountPath,
  TronGetAccountPaths,
  TronGetAddress,
  TronSignedTx,
  TronSignTx,
} from '@shapeshiftoss/hdwallet-core'
import { slip44ByCoin, tronDescribePath } from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const TRON_MAINNET_CAIP2 = 'tron:0x2b6653dc'

function getTronSignerAddress(provider: EthereumProvider): string | null {
  const tronAccounts = provider.session?.namespaces?.tron?.accounts
  if (!tronAccounts || tronAccounts.length === 0) return null
  // CAIP-10 format: tron:0x2b6653dc:T...
  return tronAccounts[0].split(':')[2] ?? null
}

export function describeTronPath(path: number[]): PathDescription {
  return tronDescribePath(path)
}

export function tronWcGetAccountPaths(msg: TronGetAccountPaths): TronAccountPath[] {
  const slip44 = slip44ByCoin('Tron')
  if (slip44 === undefined) return []
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
    },
  ]
}

export function tronNextAccountPath(_msg: TronAccountPath): TronAccountPath | undefined {
  return undefined
}

export async function tronGetAddress(
  provider: EthereumProvider,
  _msg: TronGetAddress,
): Promise<string | null> {
  try {
    return getTronSignerAddress(provider)
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function tronSignTx(
  provider: EthereumProvider,
  msg: TronSignTx,
): Promise<TronSignedTx | null> {
  try {
    const signerAddress = getTronSignerAddress(provider)
    if (!signerAddress) return null

    const transaction = msg.transaction ?? { raw_data_hex: msg.rawDataHex }

    const result = await provider.signer.request<{ signature: string[] }>(
      {
        method: 'tron_signTransaction',
        params: {
          address: signerAddress,
          transaction,
        },
      },
      TRON_MAINNET_CAIP2,
    )

    const signature = result?.signature?.[0]
    if (!signature) return null

    return {
      serialized: msg.rawDataHex + signature,
      signature,
    }
  } catch (error) {
    console.error(error)
    return null
  }
}
