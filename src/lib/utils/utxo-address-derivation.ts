import { HDKey } from '@scure/bip32'
import type { Network } from '@shapeshiftoss/bitcoinjs-lib'
import { networks, payments } from '@shapeshiftoss/bitcoinjs-lib'
import type { AccountId } from '@shapeshiftoss/caip'
import { bchChainId, fromAccountId } from '@shapeshiftoss/caip'
import { UtxoAccountType } from '@shapeshiftoss/types'
import * as bchaddr from 'bchaddrjs'
import { decode, encode } from 'bs58check'

const CHAIN_ID_TO_NETWORK: Record<string, Network> = {
  'bip122:000000000019d6689c085ae165831e93': networks.bitcoin,
  'bip122:12a765e31ffd4059bada1e25190f6e98': {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
  'bip122:00000000001a91e3dace36e2be3bf030': {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: 'doge',
    bip32: { public: 0x02facafd, private: 0x02fac398 },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
  },
  'bip122:000000000000000000651ef99cb9fcbe': {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bitcoincash',
    bip32: { public: 0x0488b21e, private: 0x0488ade4 },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
  },
}

const normalizeXpubToStandard = (xpub: string): string => {
  const xpubPrefixes = ['xpub', 'ypub', 'zpub', 'Ltub', 'Mtub', 'dgub']
  const prefix = xpub.substring(0, 4)

  if (!xpubPrefixes.includes(prefix)) {
    return xpub
  }

  try {
    const decoded = decode(xpub)
    const xpubVersion = Buffer.from('0488b21e', 'hex')
    const xpubData = Buffer.concat([xpubVersion, decoded.slice(4)])
    return encode(xpubData)
  } catch (error) {
    return xpub
  }
}

export const deriveUtxoAddress = (
  xpub: string,
  index: number,
  accountType: UtxoAccountType,
  chainId: string,
): string | null => {
  try {
    const normalizedXpub = normalizeXpubToStandard(xpub)
    const hdkey = HDKey.fromExtendedKey(normalizedXpub)

    // Derive m/0/index (receive path)
    const child = hdkey.deriveChild(0).deriveChild(index)

    if (!child.publicKey) {
      return null
    }

    const network = CHAIN_ID_TO_NETWORK[chainId]
    if (!network) {
      console.error(`Unknown chain ID: ${chainId}`)
      return null
    }

    let address: string | undefined

    switch (accountType) {
      case UtxoAccountType.SegwitNative: {
        // P2WPKH - Native SegWit (bc1...)
        const payment = payments.p2wpkh({
          pubkey: Buffer.from(child.publicKey),
          network,
        })
        address = payment.address
        break
      }
      case UtxoAccountType.SegwitP2sh: {
        // P2SH-P2WPKH - Nested SegWit (3...)
        const payment = payments.p2sh({
          redeem: payments.p2wpkh({
            pubkey: Buffer.from(child.publicKey),
            network,
          }),
          network,
        })
        address = payment.address
        break
      }
      case UtxoAccountType.P2pkh: {
        // P2PKH - Legacy (1...)
        const payment = payments.p2pkh({
          pubkey: Buffer.from(child.publicKey),
          network,
        })
        address = payment.address
        break
      }
      default:
        return null
    }

    return address ?? null
  } catch (error) {
    console.error(`Failed to derive address at index ${index}:`, error)
    return null
  }
}

export const UTXO_ADDRESS_DERIVATION_CONFIG = {
  DEFAULT_DERIVATION_COUNT: 20,
  MAX_DERIVATION_COUNT: 100,
} as const

export const deriveUtxoAddresses = (
  xpub: string,
  accountType: UtxoAccountType,
  chainId: string,
  count: number = UTXO_ADDRESS_DERIVATION_CONFIG.DEFAULT_DERIVATION_COUNT,
): string[] => {
  const derivationCount = Math.min(count, UTXO_ADDRESS_DERIVATION_CONFIG.MAX_DERIVATION_COUNT)
  const addresses: string[] = []

  try {
    const normalizedXpub = normalizeXpubToStandard(xpub)
    const hdkey = HDKey.fromExtendedKey(normalizedXpub)
    const network = CHAIN_ID_TO_NETWORK[chainId]

    if (!network) {
      console.error(`Unknown chain ID: ${chainId}`)
      return addresses
    }

    // Derive addresses from BOTH receive (m/0) and change (m/1) paths
    for (const isChange of [false, true]) {
      const pathIndex = isChange ? 1 : 0

      for (let i = 0; i < derivationCount; i++) {
        const child = hdkey.deriveChild(pathIndex).deriveChild(i)

        if (!child.publicKey) continue

        let address: string | undefined

        switch (accountType) {
          case UtxoAccountType.SegwitNative: {
            const payment = payments.p2wpkh({
              pubkey: Buffer.from(child.publicKey),
              network,
            })
            address = payment.address
            break
          }
          case UtxoAccountType.SegwitP2sh: {
            const payment = payments.p2sh({
              redeem: payments.p2wpkh({
                pubkey: Buffer.from(child.publicKey),
                network,
              }),
              network,
            })
            address = payment.address
            break
          }
          case UtxoAccountType.P2pkh: {
            const payment = payments.p2pkh({
              pubkey: Buffer.from(child.publicKey),
              network,
            })
            address = payment.address
            break
          }
          default:
            console.error(`Unsupported account type: ${accountType}`)
            continue
        }

        if (address) {
          addresses.push(address)
        }
      }
    }
  } catch (error) {
    console.error('Failed to derive UTXO addresses:', error)
  }

  return addresses
}

export const deriveUtxoAddressesForAccountId = (
  accountId: AccountId,
  accountType: UtxoAccountType,
  count?: number,
): string[] => {
  const { chainId, account: xpub } = fromAccountId(accountId)
  return deriveUtxoAddresses(xpub, accountType, chainId, count)
}

export const isAddressInUtxoAccount = (
  address: string,
  accountId: AccountId,
  accountType: UtxoAccountType,
  count?: number,
): boolean => {
  const { chainId } = fromAccountId(accountId)
  const isBch = chainId === bchChainId
  const normalizedAddress = (isBch ? normalizeBchAddress(address) : address).toLowerCase()
  const derivedAddresses = deriveUtxoAddressesForAccountId(accountId, accountType, count)
  return derivedAddresses.some(
    derivedAddress => derivedAddress && derivedAddress.toLowerCase() === normalizedAddress,
  )
}

const normalizeBchAddress = (address: string): string => {
  try {
    return bchaddr.toLegacyAddress(address)
  } catch {
    return address
  }
}

export const findUtxoAccountIdByAddress = (
  address: string,
  accountIds: AccountId[],
  accountMetadata: Record<AccountId, { accountType?: UtxoAccountType }>,
  chainId: string,
): AccountId | null => {
  const isBch = chainId === bchChainId
  const normalizedAddress = (isBch ? normalizeBchAddress(address) : address).toLowerCase()

  // Filter UTXO accounts for the specified chain
  const relevantAccountIds = accountIds.filter(accountId => {
    const { chainId: accountChainId } = fromAccountId(accountId)
    return accountChainId === chainId
  })

  // Derive 30 addresses per path (60 total: 30 receive + 30 change)
  // This covers the standard gap limit (20) with a reasonable buffer
  const DERIVATION_COUNT = 30

  // Try each account
  for (const accountId of relevantAccountIds) {
    const metadata = accountMetadata[accountId]
    if (!metadata?.accountType) continue

    try {
      const derivedAddresses = deriveUtxoAddressesForAccountId(
        accountId,
        metadata.accountType,
        DERIVATION_COUNT,
      )

      const matchIndex = derivedAddresses.findIndex(
        derivedAddress => derivedAddress && derivedAddress.toLowerCase() === normalizedAddress,
      )

      if (matchIndex !== -1) {
        return accountId
      }
    } catch (error) {
      console.error(`Failed to derive addresses for account ${accountId}:`, error)
      continue
    }
  }

  return null
}
