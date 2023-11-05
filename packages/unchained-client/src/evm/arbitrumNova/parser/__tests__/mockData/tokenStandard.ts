import type { Tx } from '../../../../../evm'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0x65f9162ac5b6f5d74afb44b0318555b67755263849807945a68c20868c9b7fbe',
  blockHash: '0xa4eaadb1a77dfdf6473ac575163a33de871853e13b6cc803931bca6ceb6e7147',
  blockHeight: 27645077,
  timestamp: 1698950012,
  status: 1,
  from: '0x41d3D33156aE7c62c094AAe2995003aE63f587B3',
  to: '0x750ba8b76187092B0D1E87E28daaf484d1b5273b',
  confirmations: 1375,
  value: '0',
  fee: '831760000000',
  gasLimit: '250000',
  gasUsed: '83176',
  gasPrice: '10000000',
  inputData:
    '0xa9059cbb0000000000000000000000008fa69f067d23ed3775ecee954fb3b000b4d77851000000000000000000000000000000000000000000000000000000000002231a',
  tokenTransfers: [
    {
      contract: '0x750ba8b76187092B0D1E87E28daaf484d1b5273b',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x41d3D33156aE7c62c094AAe2995003aE63f587B3',
      to: '0x8fA69f067D23ED3775ecEe954fB3B000b4D77851',
      value: '140058',
    },
  ],
  internalTxs: [],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
