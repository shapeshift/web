import { CHAIN_NAMESPACE, CHAIN_REFERENCE, toChainId } from '@shapeshiftoss/caip'
import { bech32, bech32m } from 'bech32'
import bs58check from 'bs58check'
import { encode as encodeCashAddr } from 'cashaddrjs'
import { describe, expect, it } from 'vitest'

import {
  getAddressFormatHint,
  isValidBitcoinAddress,
  isValidBitcoinCashAddress,
  isValidDogecoinAddress,
  isValidLitecoinAddress,
  isValidStarknetAddress,
  isValidTonAddress,
  isValidZcashAddress,
  validateAddress,
} from '../addressValidation'

const HASH160 = new Uint8Array(20).fill(0x11)
const HASH256 = new Uint8Array(32).fill(0x22)

const base58CheckAddr = (versionByte: number, hash: Uint8Array = HASH160): string => {
  const payload = new Uint8Array(1 + hash.length)
  payload[0] = versionByte
  payload.set(hash, 1)
  return bs58check.encode(payload)
}

const bech32Addr = (
  hrp: string,
  witnessVersion: number,
  data: Uint8Array,
  codec: typeof bech32 | typeof bech32m = bech32,
): string => codec.encode(hrp, [witnessVersion, ...codec.toWords(data)])

const btcChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.BitcoinMainnet,
})
const ltcChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.LitecoinMainnet,
})
const bchChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.BitcoinCashMainnet,
})
const dogeChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.DogecoinMainnet,
})
const ethChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Evm,
  chainReference: CHAIN_REFERENCE.EthereumMainnet,
})
const cosmosChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.CosmosSdk,
  chainReference: CHAIN_REFERENCE.CosmosHubMainnet,
})
const thorChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.CosmosSdk,
  chainReference: CHAIN_REFERENCE.ThorchainMainnet,
})
const mayaChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.CosmosSdk,
  chainReference: CHAIN_REFERENCE.MayachainMainnet,
})
const solChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Solana,
  chainReference: CHAIN_REFERENCE.SolanaMainnet,
})

// Address fixtures, constructed so they have valid checksums by construction.
const BTC_P2PKH = base58CheckAddr(0x00)
const BTC_P2SH = base58CheckAddr(0x05)
const BTC_P2WPKH = bech32Addr('bc', 0, HASH160)
const BTC_P2TR = bech32Addr('bc', 1, HASH256, bech32m)

const LTC_P2PKH = base58CheckAddr(0x30)
const LTC_P2SH_MODERN = base58CheckAddr(0x32)
const LTC_P2SH_LEGACY = base58CheckAddr(0x05) // collides with BTC P2SH
const LTC_P2WPKH = bech32Addr('ltc', 0, HASH160)
const LTC_P2TR = bech32Addr('ltc', 1, HASH256, bech32m)

const DOGE_P2PKH = base58CheckAddr(0x1e)
const DOGE_P2SH = base58CheckAddr(0x16)

const BCH_CASHADDR_P2PKH = encodeCashAddr('bitcoincash', 'P2PKH', HASH160)
const BCH_CASHADDR_P2SH = encodeCashAddr('bitcoincash', 'P2SH', HASH160)

const COSMOS_ADDR = bech32.encode('cosmos', bech32.toWords(HASH160))
const THOR_ADDR = bech32.encode('thor', bech32.toWords(HASH160))
const MAYA_ADDR = bech32.encode('maya', bech32.toWords(HASH160))

// EIP-55 example from the spec
const ETH_LOWER = '0x52908400098527886e0f7030069857d2e4169ee7'
const ETH_UPPER = '0x52908400098527886E0F7030069857D2E4169EE7'

// Known valid Solana addresses
const SOL_SYSTEM_PROGRAM = '11111111111111111111111111111111'
const SOL_WRAPPED_SOL = 'So11111111111111111111111111111111111111112'

describe('isValidBitcoinAddress', () => {
  it('accepts P2PKH (BIP44)', () => {
    expect(isValidBitcoinAddress(BTC_P2PKH)).toBe(true)
  })
  it('accepts P2SH (BIP49)', () => {
    expect(isValidBitcoinAddress(BTC_P2SH)).toBe(true)
  })
  it('accepts P2WPKH (BIP84)', () => {
    expect(isValidBitcoinAddress(BTC_P2WPKH)).toBe(true)
  })
  it('accepts P2TR (BIP86)', () => {
    expect(isValidBitcoinAddress(BTC_P2TR)).toBe(true)
  })
  it('rejects Litecoin P2PKH (wrong version byte)', () => {
    expect(isValidBitcoinAddress(LTC_P2PKH)).toBe(false)
  })
  it('rejects Dogecoin P2PKH', () => {
    expect(isValidBitcoinAddress(DOGE_P2PKH)).toBe(false)
  })
  it('rejects bc1 with corrupted checksum', () => {
    const corrupted = BTC_P2WPKH.slice(0, -1) + (BTC_P2WPKH.endsWith('a') ? 'b' : 'a')
    expect(isValidBitcoinAddress(corrupted)).toBe(false)
  })
  it('rejects mixed-case bech32', () => {
    const mixed = BTC_P2WPKH.slice(0, 5) + BTC_P2WPKH.slice(5).toUpperCase()
    expect(isValidBitcoinAddress(mixed)).toBe(false)
  })
  it('rejects empty string', () => {
    expect(isValidBitcoinAddress('')).toBe(false)
  })
})

describe('isValidLitecoinAddress', () => {
  it('accepts P2PKH L… (BIP44)', () => {
    expect(isValidLitecoinAddress(LTC_P2PKH)).toBe(true)
  })
  it('accepts modern P2SH M… (BIP49)', () => {
    expect(isValidLitecoinAddress(LTC_P2SH_MODERN)).toBe(true)
  })
  it('accepts legacy P2SH 3… (pre-2018 BIP49)', () => {
    expect(isValidLitecoinAddress(LTC_P2SH_LEGACY)).toBe(true)
  })
  it('accepts P2WPKH ltc1q… (BIP84)', () => {
    expect(isValidLitecoinAddress(LTC_P2WPKH)).toBe(true)
  })
  it('accepts Taproot ltc1p…', () => {
    expect(isValidLitecoinAddress(LTC_P2TR)).toBe(true)
  })
  it('rejects Bitcoin P2PKH (wrong version byte)', () => {
    expect(isValidLitecoinAddress(BTC_P2PKH)).toBe(false)
  })
  it('rejects bc1 SegWit (wrong HRP)', () => {
    expect(isValidLitecoinAddress(BTC_P2WPKH)).toBe(false)
  })
  it('rejects Dogecoin P2PKH', () => {
    expect(isValidLitecoinAddress(DOGE_P2PKH)).toBe(false)
  })
})

describe('isValidBitcoinCashAddress', () => {
  it('accepts CashAddr P2PKH', () => {
    expect(isValidBitcoinCashAddress(BCH_CASHADDR_P2PKH)).toBe(true)
  })
  it('accepts CashAddr P2SH', () => {
    expect(isValidBitcoinCashAddress(BCH_CASHADDR_P2SH)).toBe(true)
  })
  it('accepts legacy P2PKH (shares BTC version byte)', () => {
    expect(isValidBitcoinCashAddress(BTC_P2PKH)).toBe(true)
  })
  it('accepts legacy P2SH (shares BTC version byte)', () => {
    expect(isValidBitcoinCashAddress(BTC_P2SH)).toBe(true)
  })
  it('rejects CashAddr with corrupted checksum', () => {
    const corrupted = BCH_CASHADDR_P2PKH.replace(/.$/, (c: string) => (c === 'a' ? 'b' : 'a'))
    expect(isValidBitcoinCashAddress(corrupted)).toBe(false)
  })
  it('rejects Litecoin P2PKH', () => {
    expect(isValidBitcoinCashAddress(LTC_P2PKH)).toBe(false)
  })
})

describe('isValidDogecoinAddress', () => {
  it('accepts P2PKH D…', () => {
    expect(isValidDogecoinAddress(DOGE_P2PKH)).toBe(true)
  })
  it('accepts P2SH (9…/A…)', () => {
    expect(isValidDogecoinAddress(DOGE_P2SH)).toBe(true)
  })
  it('rejects Bitcoin P2PKH', () => {
    expect(isValidDogecoinAddress(BTC_P2PKH)).toBe(false)
  })
  it('rejects Litecoin P2PKH', () => {
    expect(isValidDogecoinAddress(LTC_P2PKH)).toBe(false)
  })
})

describe('validateAddress: EVM', () => {
  it('accepts all-lowercase', () => {
    expect(validateAddress(ETH_LOWER, ethChainId)).toEqual({ valid: true })
  })
  it('accepts all-uppercase', () => {
    expect(validateAddress(ETH_UPPER, ethChainId)).toEqual({ valid: true })
  })
  it('rejects wrong length', () => {
    expect(validateAddress('0x123', ethChainId).valid).toBe(false)
  })
  it('rejects non-hex', () => {
    expect(validateAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', ethChainId).valid).toBe(
      false,
    )
  })
  it('rejects empty', () => {
    expect(validateAddress('', ethChainId)).toEqual({ valid: false, error: 'Address is required' })
  })
})

describe('validateAddress: UTXO', () => {
  it('accepts BTC P2PKH on Bitcoin chain', () => {
    expect(validateAddress(BTC_P2PKH, btcChainId)).toEqual({ valid: true })
  })
  it('rejects BTC P2PKH on Litecoin chain', () => {
    expect(validateAddress(BTC_P2PKH, ltcChainId)).toEqual({
      valid: false,
      error: 'Invalid Litecoin address',
    })
  })
  it('rejects LTC L… on Bitcoin chain', () => {
    expect(validateAddress(LTC_P2PKH, btcChainId)).toEqual({
      valid: false,
      error: 'Invalid Bitcoin address',
    })
  })
  it('accepts LTC legacy 3… as both Bitcoin and Litecoin (documented collision)', () => {
    expect(validateAddress(LTC_P2SH_LEGACY, btcChainId).valid).toBe(true)
    expect(validateAddress(LTC_P2SH_LEGACY, ltcChainId).valid).toBe(true)
  })
  it('rejects Dogecoin on Bitcoin chain', () => {
    expect(validateAddress(DOGE_P2PKH, btcChainId).valid).toBe(false)
  })
})

describe('validateAddress: CosmosSdk', () => {
  it('accepts cosmos1… on Cosmos Hub', () => {
    expect(validateAddress(COSMOS_ADDR, cosmosChainId)).toEqual({ valid: true })
  })
  it('accepts thor1… on THORChain', () => {
    expect(validateAddress(THOR_ADDR, thorChainId)).toEqual({ valid: true })
  })
  it('accepts maya1… on MAYAChain', () => {
    expect(validateAddress(MAYA_ADDR, mayaChainId)).toEqual({ valid: true })
  })
  it('rejects cosmos1… on THORChain (HRP mismatch)', () => {
    expect(validateAddress(COSMOS_ADDR, thorChainId)).toEqual({
      valid: false,
      error: 'Invalid THORChain address',
    })
  })
  it('rejects thor1… on Cosmos Hub', () => {
    expect(validateAddress(THOR_ADDR, cosmosChainId).valid).toBe(false)
  })
  it('rejects bech32 with corrupted checksum', () => {
    const corrupted = COSMOS_ADDR.replace(/.$/, (c: string) => (c === 'a' ? 'b' : 'a'))
    expect(validateAddress(corrupted, cosmosChainId).valid).toBe(false)
  })
})

describe('validateAddress: Solana', () => {
  it('accepts system program (32 zero bytes)', () => {
    expect(validateAddress(SOL_SYSTEM_PROGRAM, solChainId)).toEqual({ valid: true })
  })
  it('accepts wrapped SOL mint', () => {
    expect(validateAddress(SOL_WRAPPED_SOL, solChainId)).toEqual({ valid: true })
  })
  it('rejects a too-short base58 string', () => {
    expect(validateAddress('abc', solChainId)).toEqual({
      valid: false,
      error: 'Invalid Solana address',
    })
  })
  it('rejects an EVM-format string', () => {
    expect(validateAddress(ETH_LOWER, solChainId).valid).toBe(false)
  })
  it('rejects a Bitcoin P2PKH address (decodes but not 32 bytes)', () => {
    expect(validateAddress(BTC_P2PKH, solChainId).valid).toBe(false)
  })
})

describe('validateAddress: BCH', () => {
  it('accepts CashAddr P2PKH', () => {
    expect(validateAddress(BCH_CASHADDR_P2PKH, bchChainId)).toEqual({ valid: true })
  })
  it('accepts CashAddr P2SH', () => {
    expect(validateAddress(BCH_CASHADDR_P2SH, bchChainId)).toEqual({ valid: true })
  })
  it('accepts legacy P2PKH (BTC-shared)', () => {
    expect(validateAddress(BTC_P2PKH, bchChainId)).toEqual({ valid: true })
  })
})

describe('validateAddress: edge cases', () => {
  it('returns Address is required for empty string', () => {
    expect(validateAddress('', btcChainId)).toEqual({
      valid: false,
      error: 'Address is required',
    })
  })
  it('does not silently trim whitespace', () => {
    expect(validateAddress(` ${BTC_P2PKH} `, btcChainId).valid).toBe(false)
  })
})

// These tests specifically exercise the checksum / BIP350 protections that the
// previous regex-based implementation could not provide. A single-character flip
// in a legacy address preserves the regex shape but breaks base58check; a bech32
// payload re-encoded with the wrong codec passes shape checks but violates BIP350.
describe('checksum and BIP350 protections (regressions vs regex impl)', () => {
  const flipLast = (s: string): string => s.slice(0, -1) + (s.endsWith('a') ? 'b' : 'a')

  it('rejects BTC P2PKH with corrupted base58check checksum', () => {
    expect(isValidBitcoinAddress(flipLast(BTC_P2PKH))).toBe(false)
  })
  it('rejects BTC P2SH with corrupted base58check checksum', () => {
    expect(isValidBitcoinAddress(flipLast(BTC_P2SH))).toBe(false)
  })
  it('rejects LTC P2PKH with corrupted base58check checksum', () => {
    expect(isValidLitecoinAddress(flipLast(LTC_P2PKH))).toBe(false)
  })
  it('rejects LTC modern P2SH with corrupted base58check checksum', () => {
    expect(isValidLitecoinAddress(flipLast(LTC_P2SH_MODERN))).toBe(false)
  })
  it('rejects DOGE P2PKH with corrupted base58check checksum', () => {
    expect(isValidDogecoinAddress(flipLast(DOGE_P2PKH))).toBe(false)
  })
  it('rejects BCH legacy with corrupted base58check checksum', () => {
    expect(isValidBitcoinCashAddress(flipLast(BTC_P2PKH))).toBe(false)
  })

  it('rejects BIP350 violation: v0 payload encoded with bech32m', () => {
    // Same witness v0 + hash160 as BTC_P2WPKH but using bech32m checksum.
    const wrongCodec = bech32m.encode('bc', [0, ...bech32m.toWords(HASH160)])
    expect(isValidBitcoinAddress(wrongCodec)).toBe(false)
  })
  it('rejects BIP350 violation: v1 payload encoded with bech32', () => {
    // Same witness v1 + 32-byte hash as BTC_P2TR but using bech32 checksum.
    const wrongCodec = bech32.encode('bc', [1, ...bech32.toWords(HASH256)])
    expect(isValidBitcoinAddress(wrongCodec)).toBe(false)
  })
})

describe('getAddressFormatHint', () => {
  it('returns 0x... for EVM', () => {
    expect(getAddressFormatHint(ethChainId)).toBe('0x...')
  })
  it('returns the right hint per UTXO chain', () => {
    expect(getAddressFormatHint(btcChainId)).toBe('bc1... or 1... or 3...')
    expect(getAddressFormatHint(ltcChainId)).toBe('ltc1... or L... or M...')
    expect(getAddressFormatHint(bchChainId)).toBe('bitcoincash:q... or 1...')
    expect(getAddressFormatHint(dogeChainId)).toBe('D...')
  })
  it('returns the right hrp for each Cosmos SDK chain', () => {
    expect(getAddressFormatHint(cosmosChainId)).toBe('cosmos1...')
    expect(getAddressFormatHint(thorChainId)).toBe('thor1...')
    expect(getAddressFormatHint(mayaChainId)).toBe('maya1...')
  })
  it('returns Solana hint for Solana', () => {
    expect(getAddressFormatHint(solChainId)).toBe('Enter Solana address')
  })
})

const multiByteBase58CheckAddr = (versionBytes: number[], hash: Uint8Array = HASH160): string => {
  const payload = new Uint8Array(versionBytes.length + hash.length)
  payload.set(versionBytes, 0)
  payload.set(hash, versionBytes.length)
  return bs58check.encode(payload)
}

const tronChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Tron,
  chainReference: CHAIN_REFERENCE.TronMainnet,
})
const suiChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Sui,
  chainReference: CHAIN_REFERENCE.SuiMainnet,
})
const nearChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Near,
  chainReference: CHAIN_REFERENCE.NearMainnet,
})
const starknetChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Starknet,
  chainReference: CHAIN_REFERENCE.StarknetMainnet,
})
const zcashChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.ZcashMainnet,
})

describe('validateAddress - deposit flow chains', () => {
  it('accepts a tron address', () => {
    expect(validateAddress(multiByteBase58CheckAddr([0x41]), tronChainId).valid).toBe(true)
  })

  it('rejects a tron address with a bad checksum', () => {
    const address = multiByteBase58CheckAddr([0x41])
    const corrupted = `${address.slice(0, -1)}${address.endsWith('a') ? 'b' : 'a'}`
    expect(validateAddress(corrupted, tronChainId).valid).toBe(false)
  })

  it('rejects a bitcoin address on tron', () => {
    expect(validateAddress(base58CheckAddr(0x00), tronChainId).valid).toBe(false)
  })

  it('rejects an evm address on tron', () => {
    expect(validateAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', tronChainId).valid).toBe(
      false,
    )
  })

  it('accepts a sui address', () => {
    expect(validateAddress(`0x${'a'.repeat(64)}`, suiChainId).valid).toBe(true)
  })

  it('rejects a short sui address', () => {
    expect(validateAddress(`0x${'a'.repeat(40)}`, suiChainId).valid).toBe(false)
  })

  it('accepts a named near account', () => {
    expect(validateAddress('shapeshift.near', nearChainId).valid).toBe(true)
  })

  it('accepts an implicit near account', () => {
    expect(validateAddress('f'.repeat(64), nearChainId).valid).toBe(true)
  })

  it('rejects a near account with invalid characters', () => {
    expect(validateAddress('Shape Shift.near', nearChainId).valid).toBe(false)
  })

  it('accepts a starknet address', () => {
    expect(validateAddress(`0x${'1'.repeat(63)}`, starknetChainId).valid).toBe(true)
  })

  it('rejects an over-long starknet address', () => {
    expect(validateAddress(`0x${'1'.repeat(65)}`, starknetChainId).valid).toBe(false)
  })

  it('accepts transparent zcash addresses', () => {
    expect(validateAddress(multiByteBase58CheckAddr([0x1c, 0xb8]), zcashChainId).valid).toBe(true)
    expect(validateAddress(multiByteBase58CheckAddr([0x1c, 0xbd]), zcashChainId).valid).toBe(true)
  })

  it('rejects a bitcoin address on zcash', () => {
    expect(validateAddress(base58CheckAddr(0x00), zcashChainId).valid).toBe(false)
  })
})

describe('getAddressFormatHint - deposit flow chains', () => {
  it('hints the tron format', () => {
    expect(getAddressFormatHint(tronChainId)).toBe('T...')
  })

  it('hints the near format', () => {
    expect(getAddressFormatHint(nearChainId)).toBe('name.near or 64 hex chars')
  })

  it('hints hex formats for sui and starknet', () => {
    expect(getAddressFormatHint(suiChainId)).toBe('0x...')
    expect(getAddressFormatHint(starknetChainId)).toBe('0x...')
  })

  it('hints the zcash format', () => {
    expect(getAddressFormatHint(zcashChainId)).toBe('t1... or t3...')
  })
})

describe('base58check payload length', () => {
  // A correct version byte is not enough - the payload has to be a hash160
  const withPayload = (version: number[], byteCount: number) =>
    bs58check.encode(new Uint8Array([...version, ...Array(byteCount).fill(1)]))

  it('rejects a bitcoin address whose payload is not 20 bytes', () => {
    expect(isValidBitcoinAddress(withPayload([0x00], 15))).toBe(false)
    expect(isValidBitcoinAddress(withPayload([0x00], 40))).toBe(false)
  })

  it('rejects a zcash address whose payload is not 20 bytes', () => {
    expect(isValidZcashAddress(withPayload([0x1c, 0xb8], 5))).toBe(false)
  })
})

describe('witness program length', () => {
  it('accepts the v0 programs BIP141 defines', () => {
    expect(isValidBitcoinAddress(bech32Addr('bc', 0, HASH160))).toBe(true)
    expect(isValidBitcoinAddress(bech32Addr('bc', 0, HASH256))).toBe(true)
  })

  it('rejects a v0 program that is neither a key nor a script hash', () => {
    expect(isValidBitcoinAddress(bech32Addr('bc', 0, new Uint8Array(21).fill(0x11)))).toBe(false)
  })

  it('rejects a program outside the 2-40 byte range', () => {
    expect(isValidBitcoinAddress(bech32Addr('bc', 1, new Uint8Array(1), bech32m))).toBe(false)
  })

  it('still accepts taproot', () => {
    expect(isValidBitcoinAddress(bech32Addr('bc', 1, HASH256, bech32m))).toBe(true)
  })
})

describe('isValidStarknetAddress', () => {
  it('accepts a felt below the stark prime', () => {
    expect(isValidStarknetAddress('0x04a1b2c3')).toBe(true)
  })

  it('rejects the zero address', () => {
    expect(isValidStarknetAddress('0x0')).toBe(false)
  })

  it('rejects a value at or above the stark prime', () => {
    expect(isValidStarknetAddress(`0x${'f'.repeat(64)}`)).toBe(false)
  })
})

describe('isValidTonAddress', () => {
  const BOUNCEABLE = 'EQBCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQmXi'
  const NON_BOUNCEABLE = 'UQBCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQjgn'
  const TESTNET = 'kQBCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQt5o'
  const BAD_CRC = 'EQBCQkJCQkACQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQmXi'

  it('accepts bounceable and non-bounceable mainnet addresses', () => {
    expect(isValidTonAddress(BOUNCEABLE)).toBe(true)
    expect(isValidTonAddress(NON_BOUNCEABLE)).toBe(true)
  })

  it('accepts the raw workchain form', () => {
    expect(isValidTonAddress(`0:${'42'.repeat(32)}`)).toBe(true)
    expect(isValidTonAddress(`-1:${'42'.repeat(32)}`)).toBe(true)
  })

  it('rejects a testnet address', () => {
    expect(isValidTonAddress(TESTNET)).toBe(false)
  })

  it('rejects a corrupted address the checksum catches', () => {
    expect(isValidTonAddress(BAD_CRC)).toBe(false)
  })

  it('rejects addresses of the wrong shape', () => {
    expect(isValidTonAddress('')).toBe(false)
    expect(isValidTonAddress('EQBCQkJC')).toBe(false)
    expect(isValidTonAddress('0x1234')).toBe(false)
  })
})
