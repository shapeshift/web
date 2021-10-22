import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { store } from 'state/store'

import { Tx, txHistory } from './txHistorySlice'

// const setup = ({
//   assetData,
//   description
// }: {
//   assetData: Asset | undefined
//   description: string | null
// }) => {
//   ;(getAssetService as unknown as jest.Mock<unknown>).mockImplementation(() => ({
//     byTokenId: jest.fn().mockImplementation(() => assetData),
//     description: jest.fn().mockImplementation(() => description)
//   }))
// }
const EthSend = {
  address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  chain: ChainTypes.Ethereum,
  confirmations: 875,
  network: NetworkTypes.MAINNET,
  txid: '0xb8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a58b',
  fee: '2234067070809000',
  asset: 'ethereum',
  value: '250923588302732',
  chainSpecific: {},
  type: 'send',
  to: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8'
} as Tx

const EthReceive = {
  address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  chain: ChainTypes.Ethereum,
  confirmations: 875,
  network: NetworkTypes.MAINNET,
  txid: '0xb8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a59b',
  fee: '2234067070809000',
  asset: 'ethereum',
  value: '250923588302732',
  chainSpecific: {},
  type: 'receive',
  from: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8'
} as Tx

const BtcSend = {
  address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  chain: ChainTypes.Bitcoin,
  confirmations: 875,
  network: NetworkTypes.MAINNET,
  txid: '0xb8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a58b',
  fee: '2234067070809000',
  asset: 'ethereum',
  value: '250923588302732',
  chainSpecific: {},
  type: 'send',
  to: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8'
} as Tx

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({})
  })

  describe('onMessage', () => {
    it("adds tx's to object by chain", async () => {
      expect(store.getState().txHistory[ChainTypes.Ethereum]).toBeFalsy()
      await store.dispatch(txHistory.actions.onMessage({ message: EthSend }))
      expect(store.getState().txHistory[ChainTypes.Ethereum]).toBeTruthy()
      expect(store.getState().txHistory[ChainTypes.Ethereum].length).toBe(1)

      await store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(store.getState().txHistory[ChainTypes.Ethereum].length).toBe(2)

      expect(store.getState().txHistory[ChainTypes.Bitcoin]).toBeFalsy()
      await store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(store.getState().txHistory[ChainTypes.Bitcoin]).toBeTruthy()
      expect(store.getState().txHistory[ChainTypes.Bitcoin].length).toBe(1)
      expect(store.getState().txHistory[ChainTypes.Ethereum].length).toBe(2)
    })
  })
})
