import { UtxoAccountType } from '@shapeshiftoss/types'

import { normalizeXpub } from './xpubs'

const xpub =
  'xpub6GPVbpBHJMUEK8BzF4ntoP1mdtpMgXJhNSfRQew9vMLLzHB9JyRfj5C5wmqyoRfRQiRL7V7GJkqKEnDEXn1cTBnodPyBW69ao498pg6stm6'
const ypub =
  'ypub6bDkuUrCT31iARP75RaX1U7Gorxod9JCHZBeC3q3JMiE3NzNZdbEM8rDxyoZoLKLpMY8rxhpmRBs84poFURdFRUQVjfc5zy54nCnDGGhnDa'
const zpub =
  'zpub6v42D9X7biZC1iaDunN9DZCmyq7FZmHhCfhrySivgN676UobpHknyCWMzBm9oEyGDzewcSJPE5YR1MSMyAqe3fA1N5N2funZLWGRbsRjA1s'

describe('xpubs', () => {
  describe('normalizeXpub', () => {
    it.each([
      [xpub, UtxoAccountType.P2pkh, xpub],
      [xpub, UtxoAccountType.SegwitP2sh, ypub],
      [xpub, UtxoAccountType.SegwitNative, zpub],
      [ypub, UtxoAccountType.P2pkh, xpub],
      [ypub, UtxoAccountType.SegwitP2sh, ypub],
      [ypub, UtxoAccountType.SegwitNative, zpub],
      [zpub, UtxoAccountType.P2pkh, xpub],
      [zpub, UtxoAccountType.SegwitP2sh, ypub],
      [zpub, UtxoAccountType.SegwitNative, zpub]
    ])(
      'should convert %s to %s',
      async (input: string, type: UtxoAccountType, expected: string) => {
        expect(normalizeXpub(input, type)).toBe(expected)
      }
    )
  })
})
