import type { Tx } from '../../..'

const tx: Tx = {
  txid: '2gEeoU9sm8udz2vD8D98cEd9cESbetrQPXt4HhCtreQkg4Zhyo3ngzf8rM6yChiVBrZubaswrAST1y8fLEBAPxry',
  blockHeight: 297092291,
  description:
    'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV transferred 0.1 USDC to 9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN.',
  type: 'TRANSFER',
  source: 'SOLANA_PROGRAM_LIBRARY',
  fee: 5000,
  feePayer: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
  signature:
    '2gEeoU9sm8udz2vD8D98cEd9cESbetrQPXt4HhCtreQkg4Zhyo3ngzf8rM6yChiVBrZubaswrAST1y8fLEBAPxry',
  slot: 297092291,
  timestamp: 1729619989,
  tokenTransfers: [
    {
      fromTokenAccount: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
      toTokenAccount: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
      fromUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      toUserAccount: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
      tokenAmount: 0.1,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      tokenStandard: 'Fungible',
      decimals: 0,
    },
  ],
  nativeTransfers: [
    {
      fromUserAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      toUserAccount: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
      amount: 2039280,
    },
  ],
  accountData: [
    {
      account: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      nativeBalanceChange: -2044280,
      tokenBalanceChanges: [],
    },
    {
      account: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
      nativeBalanceChange: 2039280,
      tokenBalanceChanges: [
        {
          userAccount: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
          tokenAccount: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
          rawTokenAmount: {
            tokenAmount: '100000',
            decimals: 6,
          },
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      ],
    },
    {
      account: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [
        {
          userAccount: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
          tokenAccount: '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
          rawTokenAmount: {
            tokenAmount: '-100000',
            decimals: 6,
          },
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      ],
    },
    {
      account: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: '11111111111111111111111111111111',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
    {
      account: 'ComputeBudget111111111111111111111111111111',
      nativeBalanceChange: 0,
      tokenBalanceChanges: [],
    },
  ],
  transactionError: null,
  instructions: [
    {
      accounts: [
        'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
        'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
        '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        '11111111111111111111111111111111',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      ],
      data: '',
      programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      innerInstructions: [
        {
          accounts: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
          data: '84eT',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          accounts: [
            'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
            'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
          ],
          data: '11119os1e9qSs2u7TsThXqkBSRVFxhmYaFKFZ1waB2X7armDmvK3p5GmLdUxYdg3h7QSrL',
          programId: '11111111111111111111111111111111',
        },
        {
          accounts: ['Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV'],
          data: 'P',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          accounts: [
            'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          ],
          data: '6VjwX9tKNv8ebVfT1sCtYeaFBv7GbzjwC5EsJjf83hGrL',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
      ],
    },
    {
      accounts: [
        '8suMXgzzmbBpc4s12REVd6EbvmNhpEq7eAfEyj4DQSeH',
        'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
        'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
      ],
      data: '3gJqkocMWaMm',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      innerInstructions: [],
    },
    {
      accounts: [],
      data: 'H1eW63',
      programId: 'ComputeBudget111111111111111111111111111111',
      innerInstructions: [],
    },
    {
      accounts: [],
      data: '3DTZbgwsozUF',
      programId: 'ComputeBudget111111111111111111111111111111',
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
