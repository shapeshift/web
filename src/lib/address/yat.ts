import axios from 'axios'
import { getConfig } from 'config'
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

export const validateYat: ValidateYat = async ({ value }) =>
  /^\p{Extended_Pictographic}{1,5}$/u.test(value)

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
