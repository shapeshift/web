import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x89b1fffa687b695e040a4a02a591b5adde825fe956457e3d206b387e008bc2f3',
  blockHash: '0xe8d762ee3986a695562770fbd1aca260ca6af9a6cb8ace6d7ae85b70057149a5',
  blockHeight: 19085097,
  timestamp: 1706203403,
  status: 1,
  from: '0x64Fc77C58122a7fb66659Dc4D54d8CBb35EafF3b',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 761,
  value: '514305630000000000',
  fee: '15915870000000000',
  gasLimit: '800000',
  gasUsed: '176843',
  gasPrice: '90000000000',
  inputData:
    '0x4039fd4b00000000000000000000000011733abf0cdb43298f7e949c930188451a9a9ef200000000000000000000000004fa0d235c4abf4bcf4787af4cf447de572ef82800000000000000000000000080ace046480e13b1dfcc5c7535c2d2d4da652fc60000000000000000000000000000000000000000000004c3b15f68cbe5aa0aa800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000444f55543a4443394337343930384231324238373632453834344142314431343341334143323932443631364433384141354643463746384646363730324332314539464200000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
      decimals: 18,
      name: 'UMA Voting Token v1',
      symbol: 'UMA',
      type: 'ERC20',
      from: '0x157Dfa656Fdf0D18E1bA94075a53600D81cB3a97',
      to: '0x80AcE046480e13b1dFCc5c7535c2D2d4Da652Fc6',
      value: '239486540176872266724',
    },
    {
      contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH',
      type: 'ERC20',
      from: '0x11733abf0cdb43298f7e949c930188451a9A9Ef2',
      to: '0x157Dfa656Fdf0D18E1bA94075a53600D81cB3a97',
      value: '513534171555000000',
    },
  ],
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x11733abf0cdb43298f7e949c930188451a9A9Ef2',
      value: '514305630000000000',
    },
    {
      from: '0x11733abf0cdb43298f7e949c930188451a9A9Ef2',
      to: '0x9F9A7D3e131eD45225396613E383D59a732f7BeB',
      value: '771458445000000',
    },
    {
      from: '0x11733abf0cdb43298f7e949c930188451a9A9Ef2',
      to: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      value: '513534171555000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706198569973223815',
      height: '14424363',
      in: [
        {
          address: '0x293e948a6ee34c20ad1b2f79f0221355fb46bcc0',
          coins: [
            {
              amount: '3831635575',
              asset: 'AVAX.AVAX',
            },
          ],
          txID: 'DC9C74908B12B8762E844AB1D143A3AC292D616D38AA5FCF7F8FF6702C21E9FB',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'ej',
          affiliateFee: '75',
          isStreamingSwap: false,
          liquidityFee: '7049019',
          memo: '=:e:0x80AcE046480e13b1dFCc5c7535c2D2d4Da652Fc6:49053588:ej:75:f2:828:22499362075344384953000',
          networkFees: [
            {
              amount: '720000',
              asset: 'ETH.ETH',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          swapSlip: '2',
          swapTarget: '49053588',
        },
      },
      out: [
        {
          address: 'thor1kp68vjldscfw5ke6gktyaufkvq8gzh2kyfyuyn',
          coins: [
            {
              amount: '213588817',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14424363',
          txID: '',
        },
        {
          address: '0x80ace046480e13b1dfcc5c7535c2d2d4da652fc6',
          coins: [
            {
              amount: '51430563',
              asset: 'ETH.ETH',
            },
          ],
          height: '14425102',
          txID: '89B1FFFA687B695E040A4A02A591B5ADDE825FE956457E3D206B387E008BC2F3',
        },
      ],
      pools: ['AVAX.AVAX', 'ETH.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144243639000000001',
    prevPageToken: '144243639000000001',
  },
}

export default { tx, actionsResponse }
