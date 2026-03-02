import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { Psbt, Transaction } from '@shapeshiftoss/bitcoinjs-lib'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { describe, expect, it, vi } from 'vitest'

import { approveBIP122Request } from './BIP122RequestHandlerUtil'

import type { SupportedSessionRequest } from '@/plugins/walletConnectToDapps/types'
import { BIP122SigningMethod } from '@/plugins/walletConnectToDapps/types'

const MOCK_PSBT_BASE64 =
  'cHNidP8BAOwCAAAABF4m1+zqCpnawzA+PwzGu10n5TwhL7UhpoIvtSEraqJ0AQAAAAD/////3t9AHspDWEuzAUh5e4jBi9Co9drUPpd0okJXGSsloCkBAAAAAP////9eJtfs6gqZ2sMwPj8MxrtdJ+U8IS+1IaaCL7UhK2qidAAAAAAA/////7kNS/toNI2/z8SVwQG12kktpRu7lGUv3AWkUPP3W5bYAAAAAAD/////At0NAAAAAAAAFgAUMKa3d370Y7JejBkFRoVhAjxWvtPpAwAAAAAAABYAFDCmt3d+9GOyXowZBUaFYQI8Vr7TAAAAAAABAR+ZCgAAAAAAABYAFDCmt3d+9GOyXowZBUaFYQI8Vr7TAAEBH5sKAAAAAAAAFgAUMKa3d370Y7JejBkFRoVhAjxWvtMAAQEfvwUAAAAAAAAWABQwprd3fvRjsl6MGQVGhWECPFa+0wABAR/pAwAAAAAAABYAFDCmt3d+9GOyXowZBUaFYQI8Vr7TAAAA'

const MOCK_SIGNATURE = Buffer.from(
  '3045022100abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890022012345678901234567890123456789012345678901234567890123456789012340' +
    '1',
  'hex',
)
const MOCK_PUBKEY = Buffer.from(
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  'hex',
)

const createMockWallet = (overrides?: Record<string, unknown>) =>
  ({
    _supportsBTC: true,
    btcSupportsCoin: vi.fn().mockReturnValue(true),
    btcSupportsScriptType: vi.fn().mockReturnValue(true),
    btcGetAddress: vi.fn(),
    btcSignTx: vi.fn(),
    btcSignMessage: vi.fn(),
    btcVerifyMessage: vi.fn(),
    btcSupportsNativeShapeShift: vi.fn().mockReturnValue(false),
    btcSupportsSecureTransfer: vi.fn().mockReturnValue(false),
    btcNextAccountPath: vi.fn(),
    ...overrides,
  }) as unknown as HDWallet

const createSignPsbtRequestEvent = (
  psbt: string,
  signInputs: { address: string; index: number; sighashTypes?: number[] }[],
  broadcast = false,
): SupportedSessionRequest => ({
  id: 1234,
  topic: 'test-topic',
  params: {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    request: {
      method: BIP122SigningMethod.BIP122_SIGN_PSBT,
      params: {
        account: signInputs[0]?.address ?? 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
        psbt,
        signInputs,
        broadcast,
      },
    },
  },
  verifyContext: {} as any,
})

const createSignMessageRequestEvent = (
  message: string,
  account = 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
): SupportedSessionRequest => ({
  id: 5678,
  topic: 'test-topic',
  params: {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    request: {
      method: BIP122SigningMethod.BIP122_SIGN_MESSAGE,
      params: {
        account,
        message,
      },
    },
  },
  verifyContext: {} as any,
})

describe('BIP122RequestHandlerUtil', () => {
  describe('signMessage', () => {
    it('should sign a message with native SegWit params for bc1q address', async () => {
      const wallet = createMockWallet({
        btcSignMessage: vi.fn().mockResolvedValue({
          address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
          signature: 'H+mockSignature==',
        }),
      })

      const result = await approveBIP122Request({
        requestEvent: createSignMessageRequestEvent('Hello Bitcoin'),
        wallet,
      })

      expect((wallet as any).btcSignMessage).toHaveBeenCalledWith({
        addressNList: [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
        coin: 'Bitcoin',
        scriptType: BTCInputScriptType.SpendWitness,
        message: 'Hello Bitcoin',
      })

      expect(result).toEqual(
        formatJsonRpcResult(5678, {
          address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
          signature: 'H+mockSignature==',
        }),
      )
    })

    it('should use SpendP2SHWitness and BIP49 path for P2SH address', async () => {
      const wallet = createMockWallet({
        btcSignMessage: vi.fn().mockResolvedValue({
          address: '3LUs8kTZo2G3X5wxv2sWKQJiC9btU1FUae',
          signature: 'H+p2shSignature==',
        }),
      })

      await approveBIP122Request({
        requestEvent: createSignMessageRequestEvent('Hello', '3LUs8kTZo2G3X5wxv2sWKQJiC9btU1FUae'),
        wallet,
      })

      expect((wallet as any).btcSignMessage).toHaveBeenCalledWith({
        addressNList: [0x80000000 + 49, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
        coin: 'Bitcoin',
        scriptType: BTCInputScriptType.SpendP2SHWitness,
        message: 'Hello',
      })
    })

    it('should use SpendAddress and BIP44 path for legacy P2PKH address', async () => {
      const wallet = createMockWallet({
        btcSignMessage: vi.fn().mockResolvedValue({
          address: '1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr',
          signature: 'H+legacySignature==',
        }),
      })

      await approveBIP122Request({
        requestEvent: createSignMessageRequestEvent('Hello', '1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr'),
        wallet,
      })

      expect((wallet as any).btcSignMessage).toHaveBeenCalledWith({
        addressNList: [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
        coin: 'Bitcoin',
        scriptType: BTCInputScriptType.SpendAddress,
        message: 'Hello',
      })
    })

    it('should throw if btcSignMessage returns null', async () => {
      const wallet = createMockWallet({
        btcSignMessage: vi.fn().mockResolvedValue(null),
      })

      await expect(
        approveBIP122Request({
          requestEvent: createSignMessageRequestEvent('Hello'),
          wallet,
        }),
      ).rejects.toThrow('Failed to sign Bitcoin message')
    })
  })

  describe('signPsbt', () => {
    it('should return a finalized PSBT with finalScriptWitness on signed inputs', async () => {
      const originalPsbt = Psbt.fromBase64(MOCK_PSBT_BASE64)
      const inputCount = originalPsbt.txInputs.length

      const fakeTx = new Transaction()
      fakeTx.version = originalPsbt.version
      fakeTx.locktime = originalPsbt.locktime
      for (const txInput of originalPsbt.txInputs) {
        fakeTx.addInput(txInput.hash, txInput.index, txInput.sequence)
      }
      for (const txOutput of originalPsbt.txOutputs) {
        fakeTx.addOutput(txOutput.script, txOutput.value)
      }
      for (let i = 0; i < inputCount; i++) {
        fakeTx.setWitness(i, [MOCK_SIGNATURE, MOCK_PUBKEY])
      }

      const wallet = createMockWallet({
        btcSignTx: vi.fn().mockResolvedValue({
          serializedTx: fakeTx.toHex(),
          signatures: [],
        }),
      })

      const signInputs = Array.from({ length: inputCount }, (_, i) => ({
        address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
        index: i,
        sighashTypes: [1],
      }))

      const result = await approveBIP122Request({
        requestEvent: createSignPsbtRequestEvent(MOCK_PSBT_BASE64, signInputs),
        wallet,
      })

      const resultPsbt = (result as { result: { psbt: string } }).result.psbt
      expect(resultPsbt).toBeDefined()

      const signedPsbt = Psbt.fromBase64(resultPsbt)
      expect(signedPsbt).toBeDefined()

      for (let i = 0; i < inputCount; i++) {
        expect(signedPsbt.data.inputs[i].finalScriptWitness).toBeDefined()
        expect(signedPsbt.data.inputs[i].partialSig).toBeUndefined()
      }
    })

    it('should only finalize inputs specified in signInputs', async () => {
      const originalPsbt = Psbt.fromBase64(MOCK_PSBT_BASE64)

      const fakeTx = new Transaction()
      fakeTx.version = originalPsbt.version
      fakeTx.locktime = originalPsbt.locktime
      for (const txInput of originalPsbt.txInputs) {
        fakeTx.addInput(txInput.hash, txInput.index, txInput.sequence)
      }
      for (const txOutput of originalPsbt.txOutputs) {
        fakeTx.addOutput(txOutput.script, txOutput.value)
      }
      for (let i = 0; i < originalPsbt.txInputs.length; i++) {
        fakeTx.setWitness(i, [MOCK_SIGNATURE, MOCK_PUBKEY])
      }

      const wallet = createMockWallet({
        btcSignTx: vi.fn().mockResolvedValue({
          serializedTx: fakeTx.toHex(),
          signatures: [],
        }),
      })

      const signInputs = [
        { address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt', index: 0, sighashTypes: [1] },
        { address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt', index: 2, sighashTypes: [1] },
      ]

      const result = await approveBIP122Request({
        requestEvent: createSignPsbtRequestEvent(MOCK_PSBT_BASE64, signInputs),
        wallet,
      })

      const resultPsbt = (result as { result: { psbt: string } }).result.psbt
      const signedPsbt = Psbt.fromBase64(resultPsbt)

      expect(signedPsbt.data.inputs[0].finalScriptWitness).toBeDefined()
      expect(signedPsbt.data.inputs[2].finalScriptWitness).toBeDefined()

      expect(signedPsbt.data.inputs[1].finalScriptWitness).toBeUndefined()
      expect(signedPsbt.data.inputs[3].finalScriptWitness).toBeUndefined()
    })

    it('should broadcast and return txid when broadcast=true', async () => {
      const originalPsbt = Psbt.fromBase64(MOCK_PSBT_BASE64)

      const fakeTx = new Transaction()
      fakeTx.version = originalPsbt.version
      fakeTx.locktime = originalPsbt.locktime
      for (const txInput of originalPsbt.txInputs) {
        fakeTx.addInput(txInput.hash, txInput.index, txInput.sequence)
      }
      for (const txOutput of originalPsbt.txOutputs) {
        fakeTx.addOutput(txOutput.script, txOutput.value)
      }
      for (let i = 0; i < originalPsbt.txInputs.length; i++) {
        fakeTx.setWitness(i, [MOCK_SIGNATURE, MOCK_PUBKEY])
      }

      const wallet = createMockWallet({
        btcSignTx: vi.fn().mockResolvedValue({
          serializedTx: fakeTx.toHex(),
          signatures: [],
        }),
      })

      const mockChainAdapter = {
        broadcastTransaction: vi.fn().mockResolvedValue('mock-txid-123'),
      }

      const signInputs = Array.from({ length: 4 }, (_, i) => ({
        address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
        index: i,
        sighashTypes: [1],
      }))

      const result = await approveBIP122Request({
        requestEvent: createSignPsbtRequestEvent(MOCK_PSBT_BASE64, signInputs, true),
        wallet,
        chainAdapter: mockChainAdapter as any,
      })

      expect(mockChainAdapter.broadcastTransaction).toHaveBeenCalledWith({
        hex: fakeTx.toHex(),
      })
      expect(result).toEqual(formatJsonRpcResult(1234, { txid: 'mock-txid-123' }))
    })

    it('should throw if btcSignTx returns null', async () => {
      const wallet = createMockWallet({
        btcSignTx: vi.fn().mockResolvedValue(null),
      })

      const signInputs = [
        { address: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt', index: 0, sighashTypes: [1] },
      ]

      await expect(
        approveBIP122Request({
          requestEvent: createSignPsbtRequestEvent(MOCK_PSBT_BASE64, signInputs),
          wallet,
        }),
      ).rejects.toThrow('Failed to sign Bitcoin transaction')
    })
  })

  describe('sendTransfer', () => {
    it('should build, sign, broadcast, and return txid', async () => {
      const wallet = createMockWallet()

      const mockChainAdapter = {
        getPublicKey: vi.fn().mockResolvedValue({ xpub: 'xpub123' }),
        getFeeData: vi.fn().mockResolvedValue({
          average: { chainSpecific: { satoshiPerByte: '10' } },
        }),
        buildSendTransaction: vi.fn().mockResolvedValue({
          txToSign: { rawTx: 'mock-raw-tx' },
        }),
        signTransaction: vi.fn().mockResolvedValue('signed-hex-123'),
        broadcastTransaction: vi.fn().mockResolvedValue('broadcast-txid-456'),
      }

      const requestEvent: SupportedSessionRequest = {
        id: 9999,
        topic: 'test-topic',
        params: {
          chainId: 'bip122:000000000019d6689c085ae165831e93',
          request: {
            method: BIP122SigningMethod.BIP122_SEND_TRANSFER,
            params: {
              account: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
              recipientAddress: 'bc1qrecipient',
              amount: '50000',
            },
          },
        },
        verifyContext: {} as any,
      }

      const result = await approveBIP122Request({
        requestEvent,
        wallet,
        chainAdapter: mockChainAdapter as any,
      })

      expect(mockChainAdapter.getPublicKey).toHaveBeenCalled()
      expect(mockChainAdapter.getFeeData).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'bc1qrecipient',
          value: '50000',
        }),
      )
      expect(mockChainAdapter.buildSendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'bc1qrecipient',
          value: '50000',
        }),
      )
      expect(mockChainAdapter.signTransaction).toHaveBeenCalled()
      expect(mockChainAdapter.broadcastTransaction).toHaveBeenCalledWith({ hex: 'signed-hex-123' })
      expect(result).toEqual(formatJsonRpcResult(9999, { txid: 'broadcast-txid-456' }))
    })

    it('should throw if chainAdapter is not provided', async () => {
      const wallet = createMockWallet()

      const requestEvent: SupportedSessionRequest = {
        id: 9999,
        topic: 'test-topic',
        params: {
          chainId: 'bip122:000000000019d6689c085ae165831e93',
          request: {
            method: BIP122SigningMethod.BIP122_SEND_TRANSFER,
            params: {
              account: 'bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt',
              recipientAddress: 'bc1qrecipient',
              amount: '50000',
            },
          },
        },
        verifyContext: {} as any,
      }

      await expect(
        approveBIP122Request({
          requestEvent,
          wallet,
        }),
      ).rejects.toThrow('Chain adapter required for sendTransfer')
    })
  })
})
