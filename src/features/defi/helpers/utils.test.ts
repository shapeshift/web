import { ChainTypes } from '@shapeshiftoss/types'

import { chainTypeToLabel } from './utils'

describe('chainTypeToLabel', () => {
  it('can get label from chaintype', () => {
    let result = chainTypeToLabel(ChainTypes.Cosmos)
    expect(result).toEqual('Cosmos')

    result = chainTypeToLabel(ChainTypes.Osmosis)
    expect(result).toEqual('Osmosis')

    result = chainTypeToLabel(ChainTypes.Ethereum)
    expect(result).toEqual('')
  })
})
