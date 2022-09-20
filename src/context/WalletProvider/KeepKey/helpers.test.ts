import type { KeyboardEvent } from 'react'
import {
  inputValuesReducer,
  isLetter,
  isValidInput,
  parseIntToEntropy,
} from 'context/WalletProvider/KeepKey/helpers'

describe('KeepKey helpers', () => {
  describe('isValidInput', () => {
    const wordEntropy = 12
    const minInputLength = 3
    const maxInputLength = 4

    const isValidInputCurried = (
      e: KeyboardEvent,
      recoveryCharacterIndex: number,
      recoveryWordIndex: number,
    ) =>
      isValidInput(
        e,
        wordEntropy,
        minInputLength,
        maxInputLength,
        recoveryCharacterIndex,
        recoveryWordIndex,
      )

    const spaceEvent = { key: ' ' } as KeyboardEvent
    const enterEvent = { key: 'Enter' } as KeyboardEvent
    const backspaceEvent = { key: 'Backspace' } as KeyboardEvent
    const lowerCaseLetterEvent = { key: 'a' } as KeyboardEvent
    const upperCaseLetterEvent = { key: 'A' } as KeyboardEvent
    const numberEvent = { key: '3' } as KeyboardEvent

    it('handles space input correctly', () => {
      // Space invalid until at least minInputLength characters have been entered
      expect(isValidInputCurried(spaceEvent, minInputLength - 1, 0)).toEqual(false)
      // Space valid once minInputLength characters have been entered
      expect(isValidInputCurried(spaceEvent, minInputLength, 0)).toEqual(true)
      // Space invalid if we are on our final word
      expect(isValidInputCurried(spaceEvent, minInputLength, wordEntropy - 1)).toEqual(false)
    })

    it('handles enter input correctly', () => {
      // Enter invalid until at least minInputLength characters have been entered
      expect(isValidInputCurried(enterEvent, minInputLength - 1, 0)).toEqual(false)
      // Enter valid once minInputLength characters have been entered
      expect(isValidInputCurried(enterEvent, minInputLength, 0)).toEqual(true)
    })

    it('handles backspace input correctly', () => {
      // Backspace invalid when no values entered
      expect(isValidInputCurried(backspaceEvent, 0, 0)).toEqual(false)
      // Backspace valid once values entered
      expect(isValidInputCurried(backspaceEvent, 1, 0)).toEqual(true)
    })

    it('handles input correctly when all values are filled', () => {
      // Enter is valid when all inputs are filled
      expect(isValidInputCurried(enterEvent, maxInputLength, 0)).toEqual(true)
      // Space is valid when all inputs are filled
      expect(isValidInputCurried(spaceEvent, maxInputLength, 0)).toEqual(true)
      // Backspace is valid when all inputs are filled
      expect(isValidInputCurried(backspaceEvent, maxInputLength, 0)).toEqual(true)
      // Characters and numbers are not valid when all inputs are filled
      expect(isValidInputCurried(lowerCaseLetterEvent, maxInputLength, 0)).toEqual(false)
      expect(isValidInputCurried(upperCaseLetterEvent, maxInputLength, 0)).toEqual(false)
      expect(isValidInputCurried(numberEvent, maxInputLength, 0)).toEqual(false)
    })
  })

  describe('isLetter', () => {
    it('correctly identifies letter characters', () => {
      expect(isLetter('a')).toEqual(true)
      expect(isLetter('A')).toEqual(true)
    })
    it('correctly identifies non-letter characters', () => {
      expect(isLetter('=')).toEqual(false)
      expect(isLetter('.')).toEqual(false)
      expect(isLetter('3')).toEqual(false)
      expect(isLetter(' ')).toEqual(false)
      expect(isLetter('')).toEqual(false)
    })
  })

  describe('inputValuesReducer', () => {
    const current = 'ABCD'.split('')

    it('replaces character at specified index', () => {
      const newValue = 'X'
      const newValueIndex = 2
      const actual = inputValuesReducer(current, newValue, newValueIndex)
      expect(actual).toEqual('ABXD'.split(''))
    })

    it('transforms new values to uppercase', () => {
      const newValue = 'x'
      const newValueIndex = 0
      const actual = inputValuesReducer(current, newValue, newValueIndex)
      expect(actual).toEqual('XBCD'.split(''))
    })

    it('handles index larger than input array', () => {
      const newValue = 'x'
      const newValueIndex = 10
      const actual = inputValuesReducer(current, newValue, newValueIndex)
      expect(actual).toEqual('ABCD'.split(''))
    })

    it('handles negative index', () => {
      const newValue = 'x'
      const newValueIndex = -8
      const actual = inputValuesReducer(current, newValue, newValueIndex)
      expect(actual).toEqual('ABCD'.split(''))
    })
  })

  describe('parseIntToEntropy', () => {
    it('correctly types valid strings', () => {
      expect(parseIntToEntropy('128')).toEqual(128)
      expect(parseIntToEntropy('192')).toEqual(192)
    })

    it('falls back to default value for invalid strings', () => {
      expect(parseIntToEntropy('1331')).toEqual(128)
      expect(parseIntToEntropy('1')).toEqual(128)
    })
  })
})
