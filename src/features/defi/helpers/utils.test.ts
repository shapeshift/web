import { cosmosChainId, ethChainId, osmosisChainId } from '@keepkey/caip'

import { chainIdToLabel } from './utils'

describe('chainIdToLabel', () => {
  it('can get label from chaintype', () => {
    let result = chainIdToLabel(cosmosChainId)
    expect(result).toEqual('Cosmos')

    result = chainIdToLabel(osmosisChainId)
    expect(result).toEqual('Osmosis')

    result = chainIdToLabel(ethChainId)
    expect(result).toEqual('')
  })
})
