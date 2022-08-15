import { mempoolMock } from './mempoolMock'

export const tokenOnly = {
  txid: '0x29077583093eedabf886708cc84857ec681a280b8cb07431569f33a538e904ef',
  blockHash: '0x39fbd8a96a5b519ea5301ecde6dbf2c63c4a767a3368586ca4c5165ef0999af3',
  blockHeight: 12659161,
  timestamp: 1624029849,
  status: 1,
  from: '0x51f360dA50a346157a2a906600F4834b1d5bAF6b',
  to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  confirmations: 2154145,
  value: '0',
  fee: '2571189000000000',
  gasLimit: '105000',
  gasUsed: '48513',
  gasPrice: '53000000000',
  inputData:
    '0xa9059cbb0000000000000000000000005041ed759dd4afc3a72b8192c143f72f4724081a0000000000000000000000000000000000000000000000000000000016694e00',
  tokenTransfers: [
    {
      contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x51f360dA50a346157a2a906600F4834b1d5bAF6b',
      to: '0x5041ed759Dd4aFc3a72b8192C143F72f4724081A',
      value: '376000000',
    },
  ],
}

export default {
  tx: tokenOnly,
  txMempool: mempoolMock(tokenOnly),
}
