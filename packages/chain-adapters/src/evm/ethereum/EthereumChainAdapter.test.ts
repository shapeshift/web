import type * as unchained from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { ValidAddressResultType } from '../../types'
import * as ethereum from './EthereumChainAdapter'

const ENS_NAME = 'vitalik.eth'

describe('EthereumChainAdapter', () => {
  describe('validateEnsAddress', () => {
    const adapter = new ethereum.ChainAdapter({
      providers: {
        http: {} as unchained.ethereum.V1Api,
        ws: {} as unchained.ws.Client<unchained.ethereum.Tx>,
      },
      rpcUrl: '',
      thorMidgardUrl: '',
      mayaMidgardUrl: '',
    })

    it('accepts a .eth name', () => {
      expect(adapter.validateEnsAddress(ENS_NAME)).toMatchObject({
        valid: true,
        result: ValidAddressResultType.Valid,
      })
    })

    it.each(['', 'foobar', `${ENS_NAME}foobar`, `asdf${ENS_NAME}foobar`])('rejects %j', address => {
      expect(adapter.validateEnsAddress(address)).toMatchObject({
        valid: false,
        result: ValidAddressResultType.Invalid,
      })
    })
  })
})
