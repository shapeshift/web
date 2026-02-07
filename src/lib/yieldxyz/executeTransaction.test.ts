import { VersionedTransaction } from '@solana/web3.js'
import { describe, expect, it } from 'vitest'

import { decodeSolanaTransaction, toHexData, toHexOrDefault } from './executeTransaction'

const SOLANA_TX_HEX =
  '01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100080ac806e47bc347875474aa7bb69cc850274b35394eb3bc98f546eaf827843819512ae6f2a3c7bba16e9564fb4c85262df3db3dc7d78372c3d87695a68b6b520c230000000000000000000000000000000000000000000000000000000000000000ac8d857b8e1b3ce2fc58fd5b76529953ec3cddfa3b39ea764689497158bf56aa0306466fe5211732ffecadba72c39be7bc8ce5bbc5f7126b2c439b3a4000000006a1d8179137542a983437bdfe2a7ab2557f535c8a78722b68a49dc00000000006a1d817a502050b680791e6ce6db88e1e5b7150f61fc6790a4eb4d10000000006a7d51718c774c928566398691d5eb68b5eb8a39b4b6d5c73555b210000000006a7d517192c5c51218cc94c3d4af17f58daee089ba1fd44e3dbd98a0000000006a7d517193584d0feed9bb3431d13206be544281b57b8566cc5375ff400000059b9d03df205257766d67d2c57df6bc7b85f2319d3dd426290325600cb71e3280504000502801a06000400090350c3000000000000020200017a03000000c806e47bc347875474aa7bb69cc850274b35394eb3bc98f546eaf827843819511e0000000000000033376534653063376433656532393433386332613634626438653335613625ffa60000000000c80000000000000006a1d8179137542a983437bdfe2a7ab2557f535c8a78722b68a49dc000000000050201087400000000c806e47bc347875474aa7bb69cc850274b35394eb3bc98f546eaf82784381951c806e47bc347875474aa7bb69cc850274b35394eb3bc98f546eaf8278438195100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005060103070906000402000000'

const SOLANA_TX_HEX_PREFIXED = `0x${SOLANA_TX_HEX}`

const SOLANA_TX_BASE64 = Buffer.from(SOLANA_TX_HEX, 'hex').toString('base64')

// Real yield.xyz EVM enter response for plasma-usdt0 vault
const EVM_UNSIGNED_TX = JSON.stringify({
  to: '0x1dd4b13fcae900c60a350589be8052959d2ed27b',
  from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  data: '0x6e553f650000000000000000000000000000000000000000000000000000000000014f8e000000000000000000000000d8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  value: '0',
  gasLimit: '200000',
  maxFeePerGas: '54000000000',
  maxPriorityFeePerGas: '1000000000',
  nonce: 42,
  chainId: 1,
  type: 2,
})

describe('decodeSolanaTransaction', () => {
  it('should decode hex without 0x prefix (yield.xyz format)', () => {
    const bytes = decodeSolanaTransaction(SOLANA_TX_HEX)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(SOLANA_TX_HEX.length / 2)
    expect(() => VersionedTransaction.deserialize(bytes)).not.toThrow()
  })

  it('should decode hex with 0x prefix', () => {
    const bytes = decodeSolanaTransaction(SOLANA_TX_HEX_PREFIXED)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(SOLANA_TX_HEX.length / 2)
    expect(() => VersionedTransaction.deserialize(bytes)).not.toThrow()
  })

  it('should decode base64 encoded transactions', () => {
    const bytes = decodeSolanaTransaction(SOLANA_TX_BASE64)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(SOLANA_TX_HEX.length / 2)
    expect(() => VersionedTransaction.deserialize(bytes)).not.toThrow()
  })

  it('should produce identical bytes for all encoding formats', () => {
    const fromHex = decodeSolanaTransaction(SOLANA_TX_HEX)
    const fromHexPrefixed = decodeSolanaTransaction(SOLANA_TX_HEX_PREFIXED)
    const fromBase64 = decodeSolanaTransaction(SOLANA_TX_BASE64)
    expect(fromHex).toEqual(fromHexPrefixed)
    expect(fromHex).toEqual(fromBase64)
  })
})

describe('toHexOrDefault', () => {
  it('should return fallback for undefined', () => {
    expect(toHexOrDefault(undefined, '0x0')).toBe('0x0')
  })

  it('should return fallback for empty string', () => {
    expect(toHexOrDefault('', '0x0')).toBe('0x0')
  })

  it('should return hex value as-is when already hex', () => {
    expect(toHexOrDefault('0x30d40', '0x0')).toBe('0x30d40')
  })

  it('should convert number to hex', () => {
    expect(toHexOrDefault(200000, '0x0')).toBe('0x30d40')
  })

  it('should convert numeric string to hex via BigInt', () => {
    expect(toHexOrDefault('200000', '0x0')).toBe('0x30d40')
  })

  it('should return fallback for non-numeric string', () => {
    expect(toHexOrDefault('not-a-number', '0x0')).toBe('0x0')
  })
})

describe('toHexData', () => {
  it('should return 0x for undefined', () => {
    expect(toHexData(undefined)).toBe('0x')
  })

  it('should return 0x for empty string', () => {
    expect(toHexData('')).toBe('0x')
  })

  it('should return hex data as-is', () => {
    const data = '0x6e553f65000000000000000000000000'
    expect(toHexData(data)).toBe(data)
  })
})

// Real yield.xyz EVM enter response for ETH rETH liquid staking
const ETH_RETH_UNSIGNED_TX =
  '{"from":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","gasLimit":"0x036bd6","value":"62620195505843482","to":"0x16D5A408e807db8eF7c578279BEeEe6b228f1c1C","data":"0x5bcb2fc6","nonce":1307,"type":2,"maxFeePerGas":"0x0a21fe80","maxPriorityFeePerGas":"0x054e0840","chainId":1}'

// Real yield.xyz EVM enter response for AVAX sAVAX liquid staking
const AVAX_SAVAX_UNSIGNED_TX =
  '{"from":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","gasLimit":"0xde93","value":"62620195505843482","to":"0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be","data":"0x5bcb2fc6","nonce":1101,"type":2,"maxFeePerGas":"0xcaa808","maxPriorityFeePerGas":"0x03e8","chainId":43114}'

// Real yield.xyz Cosmos enter response for ATOM native staking
const COSMOS_ATOM_UNSIGNED_TX =
  '0ab5010a9b010a232f636f736d6f732e7374616b696e672e763162657461312e4d736744656c656761746512740a2d636f736d6f733161386c33737271796b356b72767a686b743763797a79353279786367687436333232773271791234636f736d6f7376616c6f7065723139396d6c63376672366c6c357435347737747473376634733063766e71676335396e6d7578661a0d0a057561746f6d1204333633351215766961205374616b654b6974204349442d3130303912680a510a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21034d61c87b52901de0969a12d285289bec15b7a7217fe2a03132b469b55f3cb1d112040a02080118970712130a0d0a057561746f6d120435383330109dca231a0b636f736d6f736875622d3420f6953a'

describe('EVM transaction parsing - plasma-usdt0 vault', () => {
  it('should parse yield.xyz EVM unsignedTransaction as valid JSON with expected fields', () => {
    const parsed = JSON.parse(EVM_UNSIGNED_TX)
    expect(parsed.to).toBe('0x1dd4b13fcae900c60a350589be8052959d2ed27b')
    expect(parsed.from).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(parsed.data).toMatch(/^0x/)
    expect(parsed.chainId).toBe(1)
    expect(parsed.type).toBe(2)
  })

  it('should produce valid hex values from EVM tx fields via toHexOrDefault', () => {
    const parsed = JSON.parse(EVM_UNSIGNED_TX)
    expect(toHexOrDefault(parsed.gasLimit, '0x0')).toBe('0x30d40')
    expect(toHexOrDefault(parsed.maxFeePerGas, '0x0')).toBe('0xc92a69c00')
    expect(toHexOrDefault(parsed.maxPriorityFeePerGas, '0x0')).toBe('0x3b9aca00')
    expect(toHexOrDefault(parsed.value, '0x0')).toBe('0x0')
    expect(toHexData(parsed.data)).toBe(parsed.data)
    expect(toHexData(parsed.to)).toBe(parsed.to)
  })
})

describe('EVM transaction parsing - ETH rETH liquid staking', () => {
  it('should parse as valid JSON with EIP-1559 fields', () => {
    const parsed = JSON.parse(ETH_RETH_UNSIGNED_TX)
    expect(parsed.to).toBe('0x16D5A408e807db8eF7c578279BEeEe6b228f1c1C')
    expect(parsed.chainId).toBe(1)
    expect(parsed.type).toBe(2)
    expect(parsed.maxFeePerGas).toBe('0x0a21fe80')
    expect(parsed.maxPriorityFeePerGas).toBe('0x054e0840')
  })

  it('should produce valid hex values from tx fields', () => {
    const parsed = JSON.parse(ETH_RETH_UNSIGNED_TX)
    expect(toHexOrDefault(parsed.gasLimit, '0x0')).toBe('0x036bd6')
    expect(toHexOrDefault(parsed.value, '0x0')).toBe('0xde78bc6ce42d1a')
    expect(toHexData(parsed.data)).toBe('0x5bcb2fc6')
  })
})

describe('EVM transaction parsing - AVAX sAVAX liquid staking', () => {
  it('should parse as valid JSON with C-Chain chainId', () => {
    const parsed = JSON.parse(AVAX_SAVAX_UNSIGNED_TX)
    expect(parsed.to).toBe('0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be')
    expect(parsed.chainId).toBe(43114)
    expect(parsed.type).toBe(2)
  })

  it('should produce valid hex values from tx fields', () => {
    const parsed = JSON.parse(AVAX_SAVAX_UNSIGNED_TX)
    expect(toHexOrDefault(parsed.gasLimit, '0x0')).toBe('0xde93')
    expect(toHexOrDefault(parsed.maxFeePerGas, '0x0')).toBe('0xcaa808')
    expect(toHexOrDefault(parsed.maxPriorityFeePerGas, '0x0')).toBe('0x03e8')
    expect(toHexOrDefault(parsed.value, '0x0')).toBe('0xde78bc6ce42d1a')
  })
})

describe('Cosmos transaction parsing - ATOM native staking', () => {
  it('should be a hex-encoded string (not JSON)', () => {
    expect(() => JSON.parse(COSMOS_ATOM_UNSIGNED_TX)).toThrow()
  })

  it('should not be mistakenly decoded by decodeSolanaTransaction as base64', () => {
    const bytes = decodeSolanaTransaction(COSMOS_ATOM_UNSIGNED_TX)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(COSMOS_ATOM_UNSIGNED_TX.length / 2)
  })
})
