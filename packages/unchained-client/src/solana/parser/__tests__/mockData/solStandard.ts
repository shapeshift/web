import type { Tx } from '../../..'

const tx: Tx = {
  txid: 'qN3jbqvw2ypfmTVJuUiohgLQgV4mq8oZ6QzuKhNeM8MX1bdAxCK7EoXJbvBUD61mhGmrFr1KQi5FqgcadfYi7CS',
  blockHeight: 294850279,
  description:
    'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW transferred 0.010000388 SOL to DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL.',
  type: 'TRANSFER',
  source: 'SYSTEM_PROGRAM',
  fee: 5000,
  feePayer: 'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW',
  signature:
    'qN3jbqvw2ypfmTVJuUiohgLQgV4mq8oZ6QzuKhNeM8MX1bdAxCK7EoXJbvBUD61mhGmrFr1KQi5FqgcadfYi7CS',
  slot: 294850279,
  timestamp: 1728580091,
  tokenTransfers: [],
  nativeTransfers: [
    {
      fromUserAccount: 'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW',
      toUserAccount: 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
      amount: 10000388,
    },
  ],
  accountData: [
    {
      account: 'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW',
      nativeBalanceChange: -10005388,
      tokenBalanceChanges: [],
    },
    {
      account: 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
      nativeBalanceChange: 10000388,
      tokenBalanceChanges: [],
    },
    {
      account: '11111111111111111111111111111111',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
  ],
  transactionError: null,
  instructions: [
    {
      accounts: [
        'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW',
        'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
      ],
      data: '3Bxs41dFLGCCYtUF',
      programId: '11111111111111111111111111111111',
      innerInstructions: [],
    },
  ],
  events: {
    compressed: null,
    nft: null,
    swap: null,
  },
}

export default { tx }
