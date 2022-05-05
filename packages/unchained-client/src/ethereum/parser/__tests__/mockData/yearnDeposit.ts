import { mempoolMock } from './mempoolMock'

const yearnDeposit = {
  txid: '0xded9a55622504979d7980b401d3b5fab234c0b64ee779f076df2023929b0f083',
  vin: [
    {
      n: 0,
      addresses: ['0x934be745172066EDF795ffc5EA9F28f19b440c63'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '0',
      n: 0,
      addresses: ['0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'],
      isAddress: true
    }
  ],
  blockHash: '0x17d278ffcb1fb940d69e72287339607445d373d0c6a654a61526b0bc805cf10c',
  blockHeight: 13730189,
  confirmations: 729332,
  blockTime: 1638487560,
  value: '0',
  fees: '9099683709794574',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x0000000000000000000000000000000000000000',
      to: '0x934be745172066EDF795ffc5EA9F28f19b440c63',
      token: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
      name: 'USDC yVault',
      symbol: 'yvUSDC',
      decimals: 6,
      value: '9178352'
    },
    {
      type: 'ERC20',
      from: '0x934be745172066EDF795ffc5EA9F28f19b440c63',
      to: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      value: '10000000'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 3,
    gasLimit: 106995,
    gasUsed: 105086,
    gasPrice: '86592730809',
    data: '0x6e553f650000000000000000000000000000000000000000000000000000000000989680000000000000000000000000934be745172066edf795ffc5ea9f28f19b440c63'
  }
}

export default {
  tx: yearnDeposit,
  txMempool: mempoolMock(yearnDeposit)
}
