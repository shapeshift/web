import axios from 'axios'
import { toChecksumAddress } from 'web3-utils'

import { ResolveYat, ValidateYat } from './address'

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
  const { data } = await axios.get<YatResponse>(
    `https://octopus-app-mkjlj.ondigitalocean.app/emoji_id/${args.value}`,
  )
  if (data.error) return ''

  const found = data.result.find(
    emoji => emoji.tag === '0x1004', // 0x1004 is eth address
  )

  if (!found) return ''
  // data format: address|description|signature|default
  return toChecksumAddress(found.data.split('|')[0])
}
