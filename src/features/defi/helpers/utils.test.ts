import { cosmosChainId, ethChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { chainIdToLabel } from './utils'

describe('chainIdToLabel', () => {
  it('can get label from chaintype', () => {
    let result = chainIdToLabel(cosmosChainId)
    expect(result).toEqual('Cosmos')

    result = chainIdToLabel(ethChainId)
    expect(result).toEqual('')
  })
})
