import { act, renderHook } from '@testing-library/react-hooks'
import * as bip39 from 'bip39'
import { useHistory, useLocation } from 'react-router-dom'

import { useNativeTestPhrase } from './useNativeTestPhrase'

jest.mock('react-router-dom', () => ({ useLocation: jest.fn(), useHistory: jest.fn() }))
jest.mock('bip39', () => ({ generateMnemonic: jest.fn() }))

const mnemonic = 'one two three four five six seven eight nine ten eleven twelve'
const randomWords =
  'thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty cow pig cat dog'

const setup = ({ state = {}, push = jest.fn() } = {}) => {
  ;(useLocation as jest.Mock<unknown>).mockImplementation(() => ({ state }))
  ;(useHistory as jest.Mock<unknown>).mockImplementation(() => ({ push }))
  ;(bip39.generateMnemonic as jest.Mock<unknown>).mockImplementation(() => randomWords)
  return renderHook(() => useNativeTestPhrase())
}

describe('useNativeTestPhrase', () => {
  describe('onMount', () => {
    it('returns 3 words from the mnemonic randomly shuffled into 12 random words', async () => {
      const state = {
        encryptedWallet: {
          encryptedWallet: 'encryptedWallet',
          decrypt: jest.fn().mockResolvedValue(mnemonic)
        }
      }
      const { result, waitForValueToChange } = setup({ state })

      await waitForValueToChange(() => result.current.shuffledWords)

      expect(result.current.shuffledRandomWords.length).toBe(15)

      expect(randomWords.split(' ')).toEqual(randomWords.split(' '))

      let count = 0
      result.current.shuffledRandomWords.forEach(word => {
        result.current.shuffledWords.forEach(arr => {
          if (arr[1] === word) count = count + 1
        })
      })
      expect(count).toBe(3)
    })

    it('sets error', async () => {
      const state = {
        encryptedWallet: {
          encryptedWallet: 'encryptedWallet',
          decrypt: jest.fn().mockRejectedValue('error')
        },
        error: undefined
      }
      const { waitForValueToChange } = setup({ state })

      await waitForValueToChange(() => state.error)

      expect(state.error).toEqual({ message: 'Error creating wallet' })
    })
  })

  describe('handleNext', () => {
    it('sets test counts and navigates them to success view', async () => {
      const state = {
        encryptedWallet: {
          encryptedWallet: 'encryptedWallet',
          decrypt: jest.fn().mockResolvedValue(mnemonic)
        }
      }
      const push = jest.fn()
      const { result, waitForValueToChange } = setup({ state, push })
      await waitForValueToChange(() => result.current.shuffledWords)

      expect(result.current.invalid).toBe(false)
      expect(result.current.testCount).toBe(1)

      // user selects word
      act(() =>
        result.current.setTestWord(result.current.shuffledWords[result.current.testCount - 1][1])
      )

      // user clicks next
      act(() => result.current.handleNext())

      expect(result.current.invalid).toBe(false)
      expect(result.current.testCount).toBe(2)

      // user selects word
      act(() =>
        result.current.setTestWord(result.current.shuffledWords[result.current.testCount - 1][1])
      )
      // user clicks next
      act(() => result.current.handleNext())

      expect(result.current.invalid).toBe(false)
      expect(result.current.testCount).toBe(3)

      // no more words to select user clicks next
      act(() => result.current.handleNext())

      // resets state and navigates to success view
      expect(result.current.shuffledWords).toEqual([])
      expect(push).toBeCalledWith('/native/success', { encryptedWallet: state.encryptedWallet })
    })

    it('sets invalid if user selects wrong word', async () => {
      const state = {
        encryptedWallet: {
          encryptedWallet: 'encryptedWallet',
          decrypt: jest.fn().mockResolvedValue(mnemonic)
        }
      }
      const push = jest.fn()
      const { result, waitForValueToChange } = setup({ state, push })
      await waitForValueToChange(() => result.current.shuffledWords)

      expect(result.current.invalid).toBe(false)
      expect(result.current.testCount).toBe(1)

      // user selects the wrong word
      act(() => result.current.setTestWord(result.current.shuffledWords[2][1]))

      // user clicks next
      act(() => result.current.handleNext())

      // sets state to invalid
      expect(result.current.invalid).toBe(true)
      expect(result.current.testCount).toBe(1)
    })
  })
})
