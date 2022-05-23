import { TrimDescriptionWithEllipsis } from './utils'

const LongFoxDescription =
  'FOX is an ERC-20 token created by ShapeShift which serves as the governance token for the ShapeShift DAO, token holders can vote on proposals relating to the operation and treasury of the DAO. The token supports'
const ExpectedTrimmedFoxDescription =
  'FOX is an ERC-20 token created by ShapeShift which serves as the governance token for the ShapeShift DAO, token holders can vote on proposals relating to the operation and treasury of the DAO...'

describe('utils', () => {
  describe('TrimDescriptionWithEllipsis', () => {
    it('should trim the description according to the max number of characters', () => {
      expect(TrimDescriptionWithEllipsis(undefined)).toEqual('')
      expect(TrimDescriptionWithEllipsis('')).toEqual('')
      expect(TrimDescriptionWithEllipsis('abcdef')).toEqual('abcdef')
      expect(TrimDescriptionWithEllipsis(LongFoxDescription)).toEqual(ExpectedTrimmedFoxDescription)
    })
  })
})
