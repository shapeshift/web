import { SHAPE_SHIFT_ROUTER_CONTRACT } from '../../constants'
import { mempoolMock } from './mempoolMock'

const yearnDepositShapeShiftRouter = {
  txid: '0xcb6f3702249a22e10e5330ad43b3eed548966cf09c3f5bb423d7835511c991fb',
  vin: [
    {
      n: 0,
      addresses: ['0x1399D13F3A0aaf08f7C5028D81447a311e4760c4'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '0',
      n: 0,
      addresses: [SHAPE_SHIFT_ROUTER_CONTRACT],
      isAddress: true
    }
  ],
  blockHash: '0x5ca865c22d32c793d6db4d5e6d31caf34ed84c4ccf5a1789d13662b7880c80a4',
  blockHeight: 14033428,
  confirmations: 193079,
  blockTime: 1642561118,
  value: '0',
  fees: '18139009291874667',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      to: SHAPE_SHIFT_ROUTER_CONTRACT,
      token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      value: '999961394864662132'
    },
    {
      type: 'ERC20',
      from: '0x0000000000000000000000000000000000000000',
      to: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      token: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      name: 'LINK yVault',
      symbol: 'yvLINK',
      decimals: 18,
      value: '987002304279657611'
    },
    {
      type: 'ERC20',
      from: SHAPE_SHIFT_ROUTER_CONTRACT,
      to: '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2',
      token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      value: '999961394864662132'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 2,
    gasLimit: 189725,
    gasUsed: 150063,
    gasPrice: '120875960709',
    data: '0x20e8c565000000000000000000000000514910771af9ca656af840dff83e8264ecf986ca0000000000000000000000001399d13f3a0aaf08f7c5028d81447a311e4760c40000000000000000000000000000000000000000000000000de09397320326740000000000000000000000000000000000000000000000000000000000000000'
  }
}

export default {
  tx: yearnDepositShapeShiftRouter,
  txMempool: mempoolMock(yearnDepositShapeShiftRouter)
}
