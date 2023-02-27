import axios from 'axios'
import { getConfig } from 'config'
import GraphemeSplitter from 'grapheme-splitter'
import { toChecksumAddress } from 'web3-utils'

// validate a yat
type ValidateYatArgs = {
  value: string
}
type ValidateYatReturn = boolean
type ValidateYat = (args: ValidateYatArgs) => Promise<ValidateYatReturn>

// resolve a yat
type ResolveYatArgs = {
  value: string
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
export const validateYat: ValidateYat = ({ value }) => {
  const graphemeCount = graphemeSplitter.countGraphemes(value)
  const isValidYatLength = graphemeCount && graphemeCount <= 5
  if (!isValidYatLength) return Promise.resolve(false)
  const graphemes = graphemeSplitter.splitGraphemes(value)
  const isYat = graphemes.every(grapheme => /\p{Extended_Pictographic}/u.test(grapheme))
  return Promise.resolve(isYat)
}

export const resolveYat: ResolveYat = async args => {
  try {
    const { data } = await axios.get<YatResponse>(
      `${getConfig().REACT_APP_YAT_NODE_URL}/emoji_id/${args.value}`,
    )
    if (data.error) return ''

    const found = data.result.find(
      emoji => emoji.tag === '0x1004', // 0x1004 is eth address
    )

    if (!found) return ''
    // data format: address|description|signature|default
    return toChecksumAddress(found.data.split('|')[0])
  } catch (e) {
    return ''
  }
}
