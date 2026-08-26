import type { HDWalletErrorType, RecoverDevice } from '@shapeshiftoss/hdwallet-core'
import type { KeyboardEvent } from 'react'

import { getConfig } from '@/config'
import { VALID_ENTROPY_NUMBERS } from '@/context/WalletProvider/KeepKey/components/RecoverySettings'

export const RELEASE_PAGE = getConfig().VITE_KEEPKEY_UPDATER_RELEASE_PAGE
export const UPDATER_BASE_URL = getConfig().VITE_KEEPKEY_UPDATER_BASE_URL

// Pairing can reject with anything, so never assert a shape before reading it
export const isHDWalletErrorType = (err: unknown, type: HDWalletErrorType): boolean =>
  (err as Error | null | undefined)?.name === type

export const isValidInput = (
  e: KeyboardEvent,
  wordEntropy: number,
  minInputLength: number,
  maxInputLength: number,
  recoveryCharacterIndex: number = 0,
  recoveryWordIndex: number = 0,
) => {
  const isSpace = e.key === ' '
  const isEnter = e.key === 'Enter'
  const isBackspace = e.key === 'Backspace'
  // KeepKey sets character index to 4 when word is complete, and we are awaiting a space
  const hasFilledAllInputs = recoveryCharacterIndex === maxInputLength
  const hasEnoughCharactersForWordMatch = recoveryCharacterIndex >= minInputLength
  const isFirstWord = recoveryWordIndex === 0
  const isLastWord = recoveryWordIndex === wordEntropy - 1
  const noCharactersEntered = recoveryCharacterIndex === 0

  // The 4th letter must be followed by space, enter or backspace
  if (hasFilledAllInputs && !isSpace && !isEnter && !isBackspace) return false
  // We can only do enter or space if we've received 3 or more characters
  if (!hasEnoughCharactersForWordMatch && (isSpace || isEnter)) return false
  // We can't do space on last word
  if (isLastWord && isSpace) return false
  // We can't get previous word while on first word
  if (isFirstWord && isBackspace && noCharactersEntered) return false

  // If we haven't early exited yet, the input is valid
  return true
}

export const isLetter = (str: string) => {
  return str.length === 1 && !!str.match(/[a-zA-Z]/i)
}

export const inputValuesReducer = (
  currentValues: (string | undefined)[],
  newValue: string | undefined,
  newValueIndex: number,
) => {
  if (0 <= newValueIndex && newValueIndex <= currentValues.length) {
    return [
      ...currentValues.slice(0, newValueIndex),
      newValue?.toUpperCase(),
      ...currentValues.slice(newValueIndex + 1),
    ]
  } else {
    return currentValues
  }
}

const isValidEntropyNumber = (entropy: number): entropy is RecoverDevice['entropy'] =>
  VALID_ENTROPY_NUMBERS.some(validEntropy => validEntropy === entropy)

export const parseIntToEntropy = (entropy: string): RecoverDevice['entropy'] => {
  const parsedEntropy = Math.floor(Number(entropy))
  return isValidEntropyNumber(parsedEntropy) ? parsedEntropy : VALID_ENTROPY_NUMBERS[0]
}

export const getPlatform = () => {
  const platform = navigator?.platform
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']

  if (macosPlatforms.includes(platform)) {
    return 'Mac OS'
  } else if (windowsPlatforms.includes(platform)) {
    return 'Windows'
  } else if (/Linux/.test(platform)) {
    return 'Linux'
  }
}

export type UpdaterDownload = { labelKey: string; url: string }

const getUpdaterFiles = (version: string): { labelKey: string; filename: string }[] => {
  switch (getPlatform()) {
    case 'Windows':
      return [{ labelKey: 'windows', filename: `KeepKey-Vault-${version}-win-x64-setup.exe` }]
    case 'Linux':
      // The only asset published without its version in the filename
      return [{ labelKey: 'linux', filename: 'KeepKey-Vault-x86_64.AppImage' }]
    case 'Mac OS':
      // navigator.platform reports MacIntel on Apple Silicon too, so we offer both builds
      return [
        { labelKey: 'macAppleSilicon', filename: `KeepKey-Vault-${version}-arm64.dmg` },
        { labelKey: 'macIntel', filename: `KeepKey-Vault-${version}-x86_64.dmg` },
      ]
    default:
      return []
  }
}

export const getUpdaterDownloads = (version: string | null | undefined): UpdaterDownload[] => {
  // The release query is still in flight on first render
  if (!version) return []

  return getUpdaterFiles(version).map(({ labelKey, filename }) => ({
    labelKey: `modals.keepKey.downloadUpdater.download.${labelKey}`,
    url: `${UPDATER_BASE_URL}v${version}/${filename}`,
  }))
}
