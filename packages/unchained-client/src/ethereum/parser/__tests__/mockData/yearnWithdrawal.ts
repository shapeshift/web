const YEARN_LINK_TOKEN_VAULT = '0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2'
import { mempoolMock } from './mempoolMock'

const yearnWithdrawal = {
  txid: '0xf76726fa317df7e7785254f5f9f59d68fd303aeba108e8f883c938250afcfd46',
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
      addresses: [YEARN_LINK_TOKEN_VAULT],
      isAddress: true
    }
  ],
  blockHash: '0xd87a7780344aa3d2e7372cec0b01d0583967189454864a0b70186e834cd6f02f',
  blockHeight: 14257654,
  confirmations: 3388,
  blockTime: 1645556924,
  value: '0',
  fees: '19460274119661600',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x43921eb2E5C78D9e887d3Ecd4620a3Bd606f4F95',
      to: '0xf6D87dFC0841A289614B3d6fdb78D956ebd3cfF0',
      token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      value: '500482168225493862'
    },
    {
      type: 'ERC20',
      from: '0xf6D87dFC0841A289614B3d6fdb78D956ebd3cfF0',
      to: YEARN_LINK_TOKEN_VAULT,
      token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      value: '500482168225493862'
    },
    {
      type: 'ERC20',
      from: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      to: '0x0000000000000000000000000000000000000000',
      token: YEARN_LINK_TOKEN_VAULT,
      name: 'LINK yVault',
      symbol: 'yvLINK',
      decimals: 18,
      value: '493501152139828806'
    },
    {
      type: 'ERC20',
      from: YEARN_LINK_TOKEN_VAULT,
      to: '0x1399D13F3A0aaf08f7C5028D81447a311e4760c4',
      token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      value: '500482168225493862'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 3,
    gasLimit: 242212,
    gasUsed: 192014,
    gasPrice: '101348204400',
    data: '0x00f714ce00000000000000000000000000000000000000000000000006d944aee58a5e460000000000000000000000001399d13f3a0aaf08f7c5028d81447a311e4760c4'
  }
}

export default {
  tx: yearnWithdrawal,
  txMempool: mempoolMock(yearnWithdrawal)
}
