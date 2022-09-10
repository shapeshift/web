import type { ethereum } from '@shapeshiftoss/unchained-client'

export const makeEthAccount = (): ethereum.Account => {
  return {
    balance: '14',
    unconfirmedBalance: '3',
    nonce: 37396,
    pubkey: '0xfDCa77f9dBBc6D29970E9E0b0Ef5e5Bc45C8fCde',
    tokens: [
      {
        balance: '1450000000000000000000',
        contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        decimals: 6,
        name: 'FOX',
        symbol: 'FOX',
        type: 'ERC20',
      },
      {
        balance: '3100360020270000000000',
        contract: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
        decimals: 18,
        name: 'SushiToken',
        symbol: 'SUSHI',
        type: 'ERC20',
      },
      {
        balance: '1916203151620000000000',
        contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        decimals: 18,
        name: 'ChainLink Token',
        symbol: 'LINK',
        type: 'ERC20',
      },
      {
        balance: '17487380790000000000',
        contract: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
        decimals: 18,
        name: 'Compound',
        symbol: 'COMP',
        type: 'ERC20',
      },
      {
        balance: '37039555080000000000',
        contract: '0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55',
        decimals: 18,
        name: 'BandToken',
        symbol: 'BAND',
        type: 'ERC20',
      },
    ],
  }
}
