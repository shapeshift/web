import { caip2, caip19 } from '@shapeshiftoss/caip'
import { AssetDataSource, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { TxStatus, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import {
  buyAssetCAIP19FromTx,
  caip2FromTx,
  caip19FromTx,
  PortfolioAssets,
  sellAssetCAIP19FromTx
} from './useBalanceChartData'

const tradeTx: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x0fbb31c944bb609dfd796405d95e290709b72a54efdc93487eba9399111f0f61',
  blockHeight: 12306330,
  blockTime: 1619312642,
  confirmations: 1334413,
  network: NetworkTypes.MAINNET,
  txid: '0x16c700240f3b6e10933882a0df72b26a0db73b1267ce14bcccd52f8615ee2b64',
  fee: { symbol: 'ETH', value: '7100940000000000' },
  status: TxStatus.Confirmed,
  asset: 'ethereum',
  chain: ChainTypes.Ethereum,
  value: '0',
  chainSpecific: {},
  type: TxType.Trade,
  tradeDetails: {
    buyAmount: '10791044921022418',
    buyAsset: 'ETH',
    dexName: 'zrx',
    feeAmount: '7100940000000000',
    sellAmount: '24000000',
    sellAsset: 'USDC'
  }
}

const sendERC20Tx: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x8e93bec969f88f472da18a88d68eaac9a4f4b6025a9e4699aedebfa8a08969c4',
  blockHeight: 13011202,
  blockTime: 1628782628,
  confirmations: 629748,
  network: NetworkTypes.MAINNET,
  txid: '0x88d774530e7b7544f86ed25e4c602a15402ac79b9617d30624c4acd3c1034769',
  fee: {
    symbol: 'ETH',
    value: '1625777000000000'
  },
  status: TxStatus.Confirmed,
  asset: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  value: '4448382624806275089213',
  chainSpecific: {
    token: {
      contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      contractType: ContractTypes.ERC20,
      name: 'FOX',
      precision: 18,
      symbol: 'FOX'
    }
  },
  chain: ChainTypes.Ethereum,
  type: TxType.Send,
  to: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
}

// const sendETHTx: Tx = {
//   address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
//   blockHash: '0xb98fb79d18200a2a19f56cdf825b2515dad6968f70ad17c6358d8869b9e7d62a',
//   blockHeight: 13011182,
//   blockTime: 1628782328,
//   confirmations: 629768,
//   network: NetworkTypes.MAINNET,
//   txid: '0xf6888ef678676c6516004fbcb578eca8ee204945ad16d687bacbe7de59cc273a',
//   status: TxStatus.Confirmed,
//   asset: 'ethereum',
//   value: '33000000000000000',
//   chainSpecific: {},
//   chain: ChainTypes.Ethereum,
//   type: TxType.Receive,
//   from: '0x3b0BC51Ab9De1e5B7B6E34E5b960285805C41736'
// }

const portfolioAssets: PortfolioAssets = {
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    caip19: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    dataSource: AssetDataSource.CoinGecko,
    name: 'USD Coin',
    precision: 6,
    tokenId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https: //assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'USDC',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    slip44: 60,
    explorer: 'https: //etherscan.io',
    explorerTxLink: 'https: //etherscan.io/tx/'
  },
  'eip155:1/slip44:60': {
    caip19: 'eip155:1/slip44:60',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    dataSource: AssetDataSource.CoinGecko,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    slip44: 60,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https: //assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https: //etherscan.io',
    explorerTxLink: 'https: //etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true
  }
}

describe('buyAssetCAIP19FromTx', () => {
  it('can make correct buy asset caip19 from tx', () => {
    const buyAssetCAIP19 = buyAssetCAIP19FromTx(tradeTx, portfolioAssets)
    const ethCAIP19 = caip19.toCAIP19({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
    expect(buyAssetCAIP19).toEqual(ethCAIP19)
  })
})

describe('sellAssetCAIP19FromTx', () => {
  it('can make correct sell asset caip19 from tx', () => {
    const sellAssetCAIP19 = sellAssetCAIP19FromTx(tradeTx, portfolioAssets)
    const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const USDCCAIP19 = caip19.toCAIP19({
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET,
      contractType: ContractTypes.ERC20,
      tokenId
    })
    expect(sellAssetCAIP19).toEqual(USDCCAIP19)
  })
})

describe('caip2FromTx', () => {
  const ethCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  it('can get correct caip2 from tx', () => {
    const sendCAIP2 = caip2FromTx(sendERC20Tx)
    expect(sendCAIP2).toEqual(ethCAIP2)
  })
})

describe('caip19FromTx', () => {
  it('can get correct caip19 from send tx', () => {
    const sendAssetCaip19 = caip19FromTx(sendERC20Tx)
    expect(sendAssetCaip19).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
  })
})
