import type * as unchained from '@shapeshiftoss/unchained-client'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { TronWeb } from 'tronweb'
import { describe, expect, it } from 'vitest'

import { ChainAdapter, TRON_ZERO_ADDRESS } from './TronChainAdapter'

const USER = 'TJpYYqijCKsnDqwo72aZuvFf5N5yrA7v9f'
const STRX = 'TU3kjFuhtEo42tsCBtfYUAZxoqQ4yuSLQ5'
const POOL = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
const TRX_ASSET_ID = 'tron:0x2b6653dc/slip44:195'
const STRX_ASSET_ID = `tron:0x2b6653dc/trc20:${STRX}`

const TRANSFER_TOPIC = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const topic = (address: string): string => TronWeb.address.toHex(address).slice(2).padStart(64, '0')
const word = (value: bigint): string => value.toString(16).padStart(64, '0')

const transferLog = (from: string, to: string, value: bigint): unchained.tron.TronTxLog => ({
  address: STRX,
  topics: [TRANSFER_TOPIC, topic(from), topic(to)],
  data: word(value),
})

const internal = (
  from: string,
  to: string,
  callValue: number,
): unchained.tron.TronInternalTransaction => ({
  hash: 'ab',
  caller_address: from,
  transferTo_address: to,
  callValueInfo: [{ callValue }],
  note: 'Y2FsbA==',
})

const makeTx = ({
  contract,
  contractRet = 'SUCCESS',
  fee,
  log = [],
  internal_transactions = [],
}: {
  contract: unchained.tron.TronTx['raw_data']['contract'][number]
  contractRet?: string
  fee: string
  log?: unchained.tron.TronTxLog[]
  internal_transactions?: unchained.tron.TronInternalTransaction[]
}): unchained.tron.TronTx => ({
  txid: 'be2515',
  txID: 'be2515',
  blockHash: '',
  blockHeight: 86510040,
  timestamp: 1790200000000,
  confirmations: 1,
  value: '0',
  fee,
  raw_data: {
    contract: [contract],
    ref_block_bytes: '',
    ref_block_hash: '',
    expiration: 0,
    timestamp: 0,
  },
  raw_data_hex: '',
  ret: [{ contractRet }],
  log,
  internal_transactions,
})

const triggerSmartContract = (
  callValue: number,
): unchained.tron.TronTx['raw_data']['contract'][number] => ({
  type: 'TriggerSmartContract',
  parameter: {
    type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
    value: {
      owner_address: USER,
      contract_address: STRX,
      call_value: callValue,
      data: 'd0e30db0',
    },
  },
})

const adapter = new ChainAdapter({
  providers: { http: {} as unchained.tron.TronApi },
  rpcUrl: 'https://tron.example',
})

describe('TronChainAdapter.parseTx', () => {
  // https://tronscan.org/#/transaction/be251534c5d8b6c036dbc7f7176052d62e45344aa474c18f0c447b179b272bb8
  it('parses a stake as the TRX sent with the call plus the minted token, ignoring contract-to-contract TRX', async () => {
    const tx = makeTx({
      contract: triggerSmartContract(12178117),
      fee: '12535800',
      log: [transferLog(TRON_ZERO_ADDRESS, USER, 9246578089003836394n)],
      internal_transactions: [internal(POOL, STRX, 32815703963), internal(STRX, STRX, 96902291484)],
    })

    const parsed = await adapter.parseTx(tx, USER)

    expect(parsed.transfers).toEqual([
      {
        assetId: TRX_ASSET_ID,
        from: [USER],
        to: [STRX],
        type: TransferType.Send,
        value: '12178117',
      },
      {
        assetId: STRX_ASSET_ID,
        from: [TRON_ZERO_ADDRESS],
        to: [USER],
        type: TransferType.Receive,
        value: '9246578089003836394',
      },
    ])
    expect(parsed.fee).toEqual({ assetId: TRX_ASSET_ID, value: '12535800' })
  })

  // https://tronscan.org/#/transaction/4b2b38496f59eff600eb4352e28f3efa95b33e9d906ecc6b69dbe2ed28a575f8
  it('parses an unstake as the burned token only', async () => {
    const tx = makeTx({
      contract: triggerSmartContract(0),
      fee: '14817400',
      log: [transferLog(USER, TRON_ZERO_ADDRESS, 10005841197506238095n)],
      internal_transactions: [internal(POOL, STRX, 628709685)],
    })

    const parsed = await adapter.parseTx(tx, USER)

    expect(parsed.transfers).toEqual([
      {
        assetId: STRX_ASSET_ID,
        from: [USER],
        to: [TRON_ZERO_ADDRESS],
        type: TransferType.Send,
        value: '10005841197506238095',
      },
    ])
    expect(parsed.fee).toEqual({ assetId: TRX_ASSET_ID, value: '14817400' })
  })

  // https://tronscan.org/#/transaction/5a28288cd9b9ceeea28fc4ba5b196ecec546b22dc46e02b92463f64a371b013b
  it('charges the fee of a failed call without moving its value', async () => {
    const tx = makeTx({
      contract: triggerSmartContract(5325706),
      contractRet: 'OUT_OF_ENERGY',
      fee: '5341200',
    })

    const parsed = await adapter.parseTx(tx, USER)

    expect(parsed.transfers).toEqual([])
    expect(parsed.fee).toEqual({ assetId: TRX_ASSET_ID, value: '5341200' })
  })

  it('still credits TRX a contract pays out to the user', async () => {
    const tx = makeTx({
      contract: triggerSmartContract(0),
      fee: '1000000',
      internal_transactions: [internal(STRX, USER, 5000000)],
    })

    const parsed = await adapter.parseTx(tx, USER)

    expect(parsed.transfers).toEqual([
      {
        assetId: TRX_ASSET_ID,
        from: [STRX],
        to: [USER],
        type: TransferType.Receive,
        value: '5000000',
      },
    ])
  })

  it('attaches no fee to a transfer the user received', async () => {
    const tx = makeTx({
      contract: {
        type: 'TransferContract',
        parameter: {
          type_url: 'type.googleapis.com/protocol.TransferContract',
          value: { owner_address: POOL, to_address: USER, amount: 71874100 },
        },
      },
      fee: '270000',
    })

    const parsed = await adapter.parseTx(tx, USER)

    expect(parsed.transfers).toEqual([
      {
        assetId: TRX_ASSET_ID,
        from: [POOL],
        to: [USER],
        type: TransferType.Receive,
        value: '71874100',
      },
    ])
    expect(parsed.fee).toBeUndefined()
  })
})
