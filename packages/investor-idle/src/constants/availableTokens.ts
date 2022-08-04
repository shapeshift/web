// import { AbiItem } from 'web3-utils'
// import { erc20Abi, idleTokenV4Abi } from './index'

/**
 * Annual Percentage Yield of a particular vault.
 */
export interface Apy {
  net_apy: number
}

export interface IdleVault {
  apr: number
  apy?: Apy
  tvl: number
  address: string
  strategy: string
  poolName: string
  tokenName: string
  cdoAddress?: string
  protocolName: string
  pricePerShare: number
  underlyingTVL: number
  underlyingAddress: string
}

export const availableTokens: IdleVault[] = [
  {
    address: '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4',
    poolName: 'DAI',
    strategy: 'Best Yield',
    tokenName: 'DAI',
    protocolName: '',
    pricePerShare: 1.08322181,
    underlyingTVL: 13235644.80034881,
    underlyingAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    apr: 1.09850054,
    tvl: 13241472.863522
  },
  {
    address: '0x5274891bEC421B39D23760c04A6755eCB444797C',
    poolName: 'USDC',
    strategy: 'Best Yield',
    tokenName: 'USDC',
    protocolName: '',
    pricePerShare: 1.084767,
    underlyingTVL: 12062132.81108803,
    underlyingAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    apr: 1.01293507,
    tvl: 12065081.27828977
  },
  {
    address: '0xF34842d05A1c888Ca02769A633DF37177415C2f8',
    poolName: 'USDT',
    strategy: 'Best Yield',
    tokenName: 'USDT',
    protocolName: '',
    pricePerShare: 1.099641,
    underlyingTVL: 7249163.85890654,
    underlyingAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    apr: 1.95249541,
    tvl: 7249477.4359708
  },
  {
    address: '0xF52CDcD458bf455aeD77751743180eC4A595Fd3F',
    poolName: 'SUSD',
    strategy: 'Best Yield',
    tokenName: 'SUSD',
    protocolName: '',
    pricePerShare: 1.14659532,
    underlyingTVL: 11946.99346559,
    underlyingAddress: '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
    apr: 1.7150448,
    tvl: 11946.99346559
  },
  {
    address: '0xc278041fDD8249FE4c1Aad1193876857EEa3D68c',
    poolName: 'TUSD',
    strategy: 'Best Yield',
    tokenName: 'TUSD',
    protocolName: '',
    pricePerShare: 1.06652059,
    underlyingTVL: 4325.39377533,
    underlyingAddress: '0x0000000000085d4780B73119b644AE5ecd22b376',
    apr: 0.17107748,
    tvl: 4325.39377533
  },
  {
    address: '0x8C81121B15197fA0eEaEE1DC75533419DcfD3151',
    poolName: 'WBTC',
    strategy: 'Best Yield',
    tokenName: 'WBTC',
    protocolName: '',
    pricePerShare: 1.00362497,
    underlyingTVL: 1.87042844,
    underlyingAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    apr: 0.1126189,
    tvl: 38533.41075789
  },
  {
    address: '0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80',
    poolName: 'WETH',
    strategy: 'Best Yield',
    tokenName: 'WETH',
    protocolName: '',
    pricePerShare: 1.00312342,
    underlyingTVL: 360.90874851,
    underlyingAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    apr: 1.17795275,
    tvl: 496177.34924547
  },
  {
    address: '0x5C960a3DCC01BE8a0f49c02A8ceBCAcf5D07fABe',
    poolName: 'RAI',
    strategy: 'Best Yield',
    tokenName: 'RAI',
    protocolName: '',
    pricePerShare: 1.03321507,
    underlyingTVL: 109639.03933623,
    underlyingAddress: '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919',
    apr: 3.78019357,
    tvl: 323289.87499509
  },
  {
    address: '0xb2d5CB72A621493fe83C6885E4A776279be595bC',
    poolName: 'FEI',
    strategy: 'Best Yield',
    tokenName: 'FEI',
    protocolName: '',
    pricePerShare: 1.04910702,
    underlyingTVL: 114737.52313255,
    underlyingAddress: '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    apr: 0.56669334,
    tvl: 114737.52313255
  },
  {
    address: '0xE9ada97bDB86d827ecbaACCa63eBcD8201D8b12E',
    strategy: 'Senior Tranche',
    poolName: 'Idle DAI Senior Tranche',
    tokenName: 'DAI',
    cdoAddress: '0xd0DbcD556cA22d3f3c142e9a3220053FD7a247BC',
    protocolName: 'Idle',
    pricePerShare: 1.00616306,
    underlyingTVL: 100644.03950916,
    underlyingAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    apr: 0.4928506,
    tvl: 100644.03950916
  },
  {
    address: '0x9cE3a740Df498646939BcBb213A66BBFa1440af6',
    strategy: 'Senior Tranche',
    poolName: 'Idle FEI Senior Tranche',
    tokenName: 'FEI',
    cdoAddress: '0x77648a2661687ef3b05214d824503f6717311596',
    protocolName: 'Idle',
    pricePerShare: 38.77909456,
    underlyingTVL: 12412.24023029,
    underlyingAddress: '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    apr: 0.50371236,
    tvl: 12412.24023029
  },
  {
    address: '0x15794DA4DCF34E674C18BbFAF4a67FF6189690F5',
    strategy: 'Senior Tranche',
    poolName: 'Convex FRAX3CRV Senior Tranche',
    tokenName: 'FRAX3CRV',
    cdoAddress: '0x4ccaf1392a17203edab55a1f2af3079a8ac513e7',
    protocolName: 'Convex',
    pricePerShare: 1.02689613,
    underlyingTVL: 6101.90921916,
    underlyingAddress: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
    apr: 5.31535063,
    tvl: 6101.90921916
  },
  {
    address: '0xFC96989b3Df087C96C806318436B16e44c697102',
    strategy: 'Senior Tranche',
    poolName: 'Convex MIM3CRV Senior Tranche',
    tokenName: 'MIM3CRV',
    cdoAddress: '0x151e89e117728ac6c93aae94c621358b0ebd1866',
    protocolName: 'Convex',
    pricePerShare: 1.06295173,
    underlyingTVL: 1328.03832138,
    underlyingAddress: '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
    apr: 14.58501097,
    tvl: 1328.03832138
  },
  {
    address: '0x790E38D85a364DD03F682f5EcdC88f8FF7299908',
    strategy: 'Senior Tranche',
    poolName: 'Convex ALUSD3CRV Senior Tranche',
    tokenName: 'ALUSD3CRV',
    cdoAddress: '0x008c589c471fd0a13ac2b9338b69f5f7a1a843e1',
    protocolName: 'Convex',
    pricePerShare: 1.01055573,
    underlyingTVL: 52997.30300715,
    underlyingAddress: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    apr: 4.02214095,
    tvl: 52997.30300715
  },
  {
    address: '0x4585F56B06D098D4EDBFc5e438b8897105991c6A',
    strategy: 'Senior Tranche',
    poolName: 'Convex MUSD3CRV Senior Tranche',
    tokenName: 'MUSD3CRV',
    cdoAddress: '0x16d88C635e1B439D8678e7BAc689ac60376fBfA6',
    protocolName: 'Convex',
    pricePerShare: 1.00009686,
    underlyingTVL: 0.4818762,
    underlyingAddress: '0x1AEf73d49Dedc4b1778d0706583995958Dc862e6',
    apr: 4.23511956,
    tvl: 0.4818762
  },
  {
    address: '0x158e04225777BBEa34D2762b5Df9eBD695C158D2',
    strategy: 'Senior Tranche',
    poolName: 'Convex 3EURCRV Senior Tranche',
    tokenName: '3EURCRV',
    cdoAddress: '0x858F5A3a5C767F8965cF7b77C51FD178C4A92F05',
    protocolName: 'Convex',
    pricePerShare: 1.00249448,
    underlyingTVL: 37949.05529435,
    underlyingAddress: '0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571',
    apr: 5.6545836,
    tvl: 37949.05529435
  },
  {
    address: '0x060a53BCfdc0452F35eBd2196c6914e0152379A6',
    strategy: 'Senior Tranche',
    poolName: 'Convex STECRV Senior Tranche',
    tokenName: 'STECRV',
    cdoAddress: '0x7ecfc031758190eb1cb303d8238d553b1d4bc8ef',
    protocolName: 'Convex',
    pricePerShare: 1.00222597,
    underlyingTVL: 7.16251088,
    underlyingAddress: '0x06325440D014e39736583c165C2963BA99fAf14E',
    apr: 3.05412236,
    tvl: 7.16251088
  },
  {
    address: '0x1e095cbF663491f15cC1bDb5919E701b27dDE90C',
    strategy: 'Senior Tranche',
    poolName: 'Euler USDC Senior Tranche',
    tokenName: 'USDC',
    cdoAddress: '0xf5a3d259bfe7288284bd41823ec5c8327a314054',
    protocolName: 'Euler',
    pricePerShare: 1.001499,
    underlyingTVL: 10198.045612,
    underlyingAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    apr: 0.60341078,
    tvl: 10198.045612
  },
  {
    address: '0xE0f126236d2a5b13f26e72cBb1D1ff5f297dDa07',
    strategy: 'Senior Tranche',
    poolName: 'Euler USDT Senior Tranche',
    tokenName: 'USDT',
    cdoAddress: '0xD5469DF8CA36E7EaeDB35D428F28E13380eC8ede',
    protocolName: 'Euler',
    pricePerShare: 1.00102,
    underlyingTVL: 10014.756133,
    underlyingAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    apr: 0.71493645,
    tvl: 10014.756133
  },
  {
    address: '0x852c4d2823E98930388b5cE1ed106310b942bD5a',
    strategy: 'Senior Tranche',
    poolName: 'Euler DAI Senior Tranche',
    tokenName: 'DAI',
    cdoAddress: '0x46c1f702a6aad1fd810216a5ff15aab1c62ca826',
    protocolName: 'Euler',
    pricePerShare: 1.00035496,
    underlyingTVL: 10008.34043425,
    underlyingAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    apr: 0.52811529,
    tvl: 10008.34043425
  },
  {
    address: '0x624DfE05202b66d871B8b7C0e14AB29fc3a5120c',
    strategy: 'Senior Tranche',
    poolName: 'Euler AGEUR Senior Tranche',
    tokenName: 'AGEUR',
    cdoAddress: '0x2398Bc075fa62Ee88d7fAb6A18Cd30bFf869bDa4',
    protocolName: 'Euler',
    pricePerShare: 1.00014756,
    underlyingTVL: 4.92574147,
    underlyingAddress: '0x1a7e4e63778b4f12a199c062f3efdd288afcbce8',
    apr: 0.12121993,
    tvl: 4.92574147
  },
  {
    address: '0xb86264c21418aA75F7c337B1821CcB4Ff4d57673',
    strategy: 'Senior Tranche',
    poolName: 'Clearpool USDC Senior Tranche',
    tokenName: 'USDC',
    cdoAddress: '0xDBCEE5AE2E9DAf0F5d93473e08780C9f45DfEb93',
    protocolName: 'Clearpool',
    pricePerShare: 1.001743,
    underlyingTVL: 57040.750058,
    underlyingAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    apr: 6.41191575,
    tvl: 57040.750058
  },
  {
    address: '0xfC558914b53BE1DfAd084fA5Da7f281F798227E7',
    strategy: 'Senior Tranche',
    poolName: 'mStable MUSD Senior Tranche',
    tokenName: 'MUSD',
    cdoAddress: '0x70320A388c6755Fc826bE0EF9f98bcb6bCCc6FeA',
    protocolName: 'mStable',
    pricePerShare: 1,
    underlyingTVL: 0.49948245,
    underlyingAddress: '0xe2f2a5C287993345a840Db3B0845fbC70f5935a5',
    apr: 1.11453763,
    tvl: 0.49948245
  },
  {
    address: '0x730348a54bA58F64295154F0662A08Cbde1225c2',
    strategy: 'Junior Tranche',
    poolName: 'Idle DAI Junior Tranche',
    tokenName: 'DAI',
    cdoAddress: '0xd0DbcD556cA22d3f3c142e9a3220053FD7a247BC',
    protocolName: 'Idle',
    pricePerShare: 1.04750136,
    underlyingTVL: 107907.1215548,
    underlyingAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    apr: 1.4522018,
    tvl: 107907.1215548
  },
  {
    address: '0x2490D810BF6429264397Ba721A488b0C439aA745',
    strategy: 'Junior Tranche',
    poolName: 'Idle FEI Junior Tranche',
    tokenName: 'FEI',
    cdoAddress: '0x77648a2661687ef3b05214d824503f6717311596',
    protocolName: 'Idle',
    pricePerShare: 151.42897379,
    underlyingTVL: 151.42896986,
    underlyingAddress: '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    apr: 1.01639521,
    tvl: 151.42896986
  },
  {
    address: '0x18cf59480d8c16856701F66028444546B7041307',
    strategy: 'Junior Tranche',
    poolName: 'Convex FRAX3CRV Junior Tranche',
    tokenName: 'FRAX3CRV',
    cdoAddress: '0x4ccaf1392a17203edab55a1f2af3079a8ac513e7',
    protocolName: 'Convex',
    pricePerShare: 1.11435899,
    underlyingTVL: 4409.9359782,
    underlyingAddress: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
    apr: 15.14378972,
    tvl: 4409.9359782
  },
  {
    address: '0x5346217536852CD30A5266647ccBB6f73449Cbd1',
    strategy: 'Junior Tranche',
    poolName: 'Convex MIM3CRV Junior Tranche',
    tokenName: 'MIM3CRV',
    cdoAddress: '0x151e89e117728ac6c93aae94c621358b0ebd1866',
    protocolName: 'Convex',
    pricePerShare: 1.90161469,
    underlyingTVL: 890.72375983,
    underlyingAddress: '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
    apr: 43.85157645,
    tvl: 890.72375983
  },
  {
    address: '0xa0E8C9088afb3Fa0F40eCDf8B551071C34AA1aa4',
    strategy: 'Junior Tranche',
    poolName: 'Convex ALUSD3CRV Junior Tranche',
    tokenName: 'ALUSD3CRV',
    cdoAddress: '0x008c589c471fd0a13ac2b9338b69f5f7a1a843e1',
    protocolName: 'Convex',
    pricePerShare: 1.04438797,
    underlyingTVL: 25545.46388475,
    underlyingAddress: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    apr: 10.28286042,
    tvl: 25545.46388475
  },
  {
    address: '0xFb08404617B6afab0b19f6cEb2Ef9E07058D043C',
    strategy: 'Junior Tranche',
    poolName: 'Convex MUSD3CRV Junior Tranche',
    tokenName: 'MUSD3CRV',
    cdoAddress: '0x16d88C635e1B439D8678e7BAc689ac60376fBfA6',
    protocolName: 'Convex',
    pricePerShare: 1.00087175,
    underlyingTVL: 0.49225731,
    underlyingAddress: '0x1AEf73d49Dedc4b1778d0706583995958Dc862e6',
    apr: 13.15236563,
    tvl: 0.49225731
  },
  {
    address: '0x3061C652b49Ae901BBeCF622624cc9f633d01bbd',
    strategy: 'Junior Tranche',
    poolName: 'Convex 3EURCRV Junior Tranche',
    tokenName: '3EURCRV',
    cdoAddress: '0x858F5A3a5C767F8965cF7b77C51FD178C4A92F05',
    protocolName: 'Convex',
    pricePerShare: 1.00644666,
    underlyingTVL: 6066.42362815,
    underlyingAddress: '0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571',
    apr: 12.61532509,
    tvl: 6066.42362815
  },
  {
    address: '0xd83246d2bCBC00e85E248A6e9AA35D0A1548968E',
    strategy: 'Junior Tranche',
    poolName: 'Convex STECRV Junior Tranche',
    tokenName: 'STECRV',
    cdoAddress: '0x7ecfc031758190eb1cb303d8238d553b1d4bc8ef',
    protocolName: 'Convex',
    pricePerShare: 1.01061763,
    underlyingTVL: 13.68867875,
    underlyingAddress: '0x06325440D014e39736583c165C2963BA99fAf14E',
    apr: 7.84513379,
    tvl: 13.68867875
  },
  {
    address: '0xe11679CDb4587FeE907d69e9eC4a7d3F0c2bcf3B',
    strategy: 'Junior Tranche',
    poolName: 'Euler USDC Junior Tranche',
    tokenName: 'USDC',
    cdoAddress: '0xf5a3d259bfe7288284bd41823ec5c8327a314054',
    protocolName: 'Euler',
    pricePerShare: 1.049118,
    underlyingTVL: 1191.438452,
    underlyingAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    apr: 1.28151279,
    tvl: 1191.438452
  },
  {
    address: '0xb1EC065abF6783BCCe003B8d6B9f947129504854',
    strategy: 'Junior Tranche',
    poolName: 'Euler USDT Junior Tranche',
    tokenName: 'USDT',
    cdoAddress: '0xD5469DF8CA36E7EaeDB35D428F28E13380eC8ede',
    protocolName: 'Euler',
    pricePerShare: 1.026693,
    underlyingTVL: 4.186483,
    underlyingAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    apr: 19.54555214,
    tvl: 4.186483
  },
  {
    address: '0x6629baA8C7c6a84290Bf9a885825E3540875219D',
    strategy: 'Junior Tranche',
    poolName: 'Euler DAI Junior Tranche',
    tokenName: 'DAI',
    cdoAddress: '0x46c1f702a6aad1fd810216a5ff15aab1c62ca826',
    protocolName: 'Euler',
    pricePerShare: 1.00954273,
    underlyingTVL: 3.80471413,
    underlyingAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    apr: 15.22805839,
    tvl: 3.80471413
  },
  {
    address: '0xcf5FD05F72cA777d71FB3e38F296AAD7cE735cB7',
    strategy: 'Junior Tranche',
    poolName: 'Euler AGEUR Junior Tranche',
    tokenName: 'AGEUR',
    cdoAddress: '0x2398Bc075fa62Ee88d7fAb6A18Cd30bFf869bDa4',
    protocolName: 'Euler',
    pricePerShare: 1.00044272,
    underlyingTVL: 5.02722461,
    underlyingAddress: '0x1a7e4e63778b4f12a199c062f3efdd288afcbce8',
    apr: 0.36163099,
    tvl: 5.02722461
  },
  {
    address: '0x4D9d9AA17c3fcEA05F20a87fc1991A045561167d',
    strategy: 'Junior Tranche',
    poolName: 'Clearpool USDC Junior Tranche',
    tokenName: 'USDC',
    cdoAddress: '0xDBCEE5AE2E9DAf0F5d93473e08780C9f45DfEb93',
    protocolName: 'Clearpool',
    pricePerShare: 1.004706,
    underlyingTVL: 133185.899062,
    underlyingAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    apr: 16.26746638,
    tvl: 133185.899062
  },
  {
    address: '0x91fb938FEa02DFd5303ACeF5a8A2c0CaB62b94C7',
    strategy: 'Junior Tranche',
    poolName: 'mStable MUSD Junior Tranche',
    tokenName: 'MUSD',
    cdoAddress: '0x70320A388c6755Fc826bE0EF9f98bcb6bCCc6FeA',
    protocolName: 'mStable',
    pricePerShare: 1,
    underlyingTVL: 0.49948245,
    underlyingAddress: '0xe2f2a5C287993345a840Db3B0845fbC70f5935a5',
    apr: 10.4889728,
    tvl: 0.49948245
  },
  {
    address: '0x2688FC68c4eac90d9E5e1B94776cF14eADe8D877',
    strategy: 'Senior Tranche',
    poolName: 'Lido STETH Senior Tranche',
    tokenName: 'STETH',
    cdoAddress: '0x34dCd573C5dE4672C8248cd12A99f875Ca112Ad8',
    protocolName: 'Lido',
    pricePerShare: 1.007481,
    underlyingTVL: 14070.28145748,
    underlyingAddress: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    apr: 2.93756414,
    tvl: 19014106.35041259
  },
  {
    address: '0x4657B96D587c4d46666C244B40216BEeEA437D0d',
    strategy: 'Senior Tranche',
    poolName: 'Convex PBTCCRV Senior Tranche',
    tokenName: 'PBTCCRV',
    cdoAddress: '0xf324Dca1Dc621FCF118690a9c6baE40fbD8f09b7',
    protocolName: 'Convex',
    pricePerShare: 1.00437554,
    underlyingTVL: 3.29208454,
    underlyingAddress: '0xC9467E453620f16b57a34a770C6bceBECe002587',
    apr: 10.13042613,
    tvl: 67417.77152925
  },
  {
    address: '0x3a52fa30c33cAF05fAeE0f9c5Dfe5fd5fe8B3978',
    strategy: 'Junior Tranche',
    poolName: 'Lido STETH Junior Tranche',
    tokenName: 'STETH',
    cdoAddress: '0x34dCd573C5dE4672C8248cd12A99f875Ca112Ad8',
    protocolName: 'Lido',
    pricePerShare: 1.07031159,
    underlyingTVL: 5170.26903191,
    underlyingAddress: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    apr: 7.09328359,
    tvl: 6986928.12436816
  },
  {
    address: '0x3872418402d1e967889aC609731fc9E11f438De5',
    strategy: 'Junior Tranche',
    poolName: 'Convex PBTCCRV Junior Tranche',
    tokenName: 'PBTCCRV',
    cdoAddress: '0xf324Dca1Dc621FCF118690a9c6baE40fbD8f09b7',
    protocolName: 'Convex',
    pricePerShare: 1.13711083,
    underlyingTVL: 8.5159613,
    underlyingAddress: '0xC9467E453620f16b57a34a770C6bceBECe002587',
    apr: 25.89691298,
    tvl: 174396.2301895
  }
]
