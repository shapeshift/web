import axios from 'axios'

// This file's functionality is going to be moved to the asset-service when it's created
// Delete this file and use the asset-service function when it exists

const DEFAULT_TOKEN_LISTS = [
  'https://tokens.coingecko.com/uniswap/all.json'
  //'https://raw.githubusercontent.com/pancakeswap/pancake-swap-interface/master/src/constants/token/pancakeswap.json'
]

export interface SwapCurrency {
  address?: string | undefined
  chainId?: number | undefined
  decimals?: number
  logoURI?: string | undefined
  name?: string | undefined
  symbol?: string | undefined
}

export type Currency = {
  address?: string | undefined
  chainId?: number | undefined
  decimals?: number
  logoURI?: string | undefined
  name?: string | undefined
  symbol?: string | undefined
}

export async function getAssetList() {
  if (!DEFAULT_TOKEN_LISTS) {
    Promise.reject('No token list found')
  }
  try {
    let tokens: SwapCurrency[] = []
    for (let l = 0; l < DEFAULT_TOKEN_LISTS.length; l++) {
      const { data } = await axios.get(DEFAULT_TOKEN_LISTS[l])
      tokens = [...data.tokens, ...tokens]
    }
    return { tokens }
  } catch (e) {
    Promise.reject(e)
    return { tokens: [] }
  }
}
