import { chainIdToLabel } from './utils'

describe('chainIdToLabel', () => {
  it('can get label from chaintype', () => {
    let result = chainIdToLabel('cosmos:cosmoshub-4')
    expect(result).toEqual('Cosmos')

    result = chainIdToLabel('cosmos:osmosis-1')
    expect(result).toEqual('Osmosis')

    result = chainIdToLabel('eip155:1')
    expect(result).toEqual('')
  })
})
