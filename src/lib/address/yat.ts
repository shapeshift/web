import type { AssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import GraphemeSplitter from 'grapheme-splitter'

// validate a yat
type ValidateYatArgs = {
  maybeAddress: string
}
type ValidateYatReturn = boolean
type ValidateYat = (args: ValidateYatArgs) => Promise<ValidateYatReturn>

// resolve a yat
type ResolveYatArgs = {
  assetId?: AssetId
  maybeAddress: string
}
type ResolveYatReturn = string
type ResolveYat = (args: ResolveYatArgs) => Promise<ResolveYatReturn>

type YatResponse = {
  result: {
    data: string
    hash: string
    tag: string
  }[]
  error: string | null
}

const graphemeSplitter = new GraphemeSplitter()
export const validateYat: ValidateYat = ({ maybeAddress: value }) => {
  const graphemeCount = graphemeSplitter.countGraphemes(value)
  const isValidYatLength = graphemeCount && graphemeCount <= 5
  if (!isValidYatLength) return Promise.resolve(false)
  const graphemes = graphemeSplitter.splitGraphemes(value)
  const isYat = graphemes.every(grapheme => /\p{Extended_Pictographic}/u.test(grapheme))
  return Promise.resolve(isYat)
}

export const resolveYat: ResolveYat = async args => {
  const { maybeAddress: value, assetId } = args
  try {
    const { data } = await axios.get<YatResponse>(
      `${getConfig().REACT_APP_YAT_NODE_URL}/emoji_id/${value}`,
    )
    if (data.error) return ''

    // see https://a.y.at/emoji_id/%F0%9F%A6%8A%F0%9F%9A%80%F0%9F%8C%88 for example
    // https://api-docs.y.at/docs/sdks/nodejs/docs/emojiidapi#lookupemojiidpayment
    /**
     * y.at allows different addresses to be mapped to different assets
     * this hands the case of a USDC address and an ETH address
     */
    const USDC_TAG_ID = '0x6300'
    const ETH_TAG_ID = '0x1004'
    const maybeUSDCData = data.result.find(emoji => emoji.tag === USDC_TAG_ID)
    const maybeETHData = data.result.find(emoji => emoji.tag === ETH_TAG_ID)

    const USDC_ASSET_ID: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

    const maybeAddress = (() => {
      switch (assetId) {
        case USDC_ASSET_ID: {
          // USDC|USD Coin|ETH|D4f520a44cdB0f123108b187Fac9D0009104f8e9|test|
          if (maybeUSDCData) return maybeUSDCData.data.split('|')[3]
          // if no USDC address, fall back to ETH
          if (maybeETHData) return maybeETHData.data.split('|')[0]
          return ''
        }
        default: {
          if (!maybeETHData) return ''
          // 05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c|willywonka.eth
          return maybeETHData.data.split('|')[0]
        }
      }
    })()

    if (!maybeAddress) return ''
    return ethers.utils.getAddress(maybeAddress)
  } catch (e) {
    return ''
  }
}
