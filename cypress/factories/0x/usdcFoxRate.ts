import { sources } from './sources'

export const makeUsdcFoxSwapRateResponse = () => {
  return {
    chainId: 1,
    price: '3.102559534813504122',
    estimatedPriceImpact: '1.4359',
    value: '0',
    gasPrice: '75000000000',
    gas: '158000',
    estimatedGas: '158000',
    protocolFee: '0',
    minimumProtocolFee: '0',
    buyTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    buyAmount: '1000000',
    sellTokenAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    sellAmount: '3102559534813504122',
    sources,
    allowanceTarget: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    sellTokenToEthRate: '8817.59565111642499705',
    buyTokenToEthRate: '2883.44136',
  }
}
