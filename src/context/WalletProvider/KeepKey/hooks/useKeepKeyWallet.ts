import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey/dist/keepkey'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { KeyManager } from 'context/WalletProvider/config'
import { useWallet } from 'context/WalletProvider/WalletProvider'

interface VersionUrl {
  version: string
  url: string
}

export interface FirmwareDetails {
  bootloader: VersionUrl
  firmware: VersionUrl
}

interface FirmwareReleases {
  latest: FirmwareDetails
  hashes: {
    bootloader: Record<string, string>
    firmware: Record<string, string>
  }
}

interface VersionStatus {
  device: string
  latest: string
  updateAvailable: boolean
}

interface Versions {
  bootloader: VersionStatus
  firmware: VersionStatus
}

export const useKeepKeyWallet = () => {
  const { state: walletState } = useWallet()
  const { type, wallet, keyring } = walletState
  const [keepKeyWallet, setKeepKeyWallet] = useState<KeepKeyHDWallet | undefined>()
  const [versions, setVersions] = useState<Versions>()
  const isKeepKey = type === KeyManager.KeepKey

  const getBootloaderVersion = (keepKey: KeepKeyHDWallet, releases: FirmwareReleases): string => {
    const hash = keepKey.features?.bootloaderHash.toString() ?? ''
    const buffer = Buffer.from(hash, 'base64')
    const hex = buffer.toString('hex')
    return releases.hashes.bootloader[hex.toLowerCase()]
  }

  useEffect(() => {
    if (!(wallet && isKeepKey)) return
    ;(async () => {
      const keepKey = wallet as KeepKeyHDWallet

      const { data: releases } = await axios.get<FirmwareReleases>(
        'https://ipfs.io/ipfs/QmYUKEeGTeGyLonyGuXaYbq7dtouRFE2FpsAZAKYVZq3Vj',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )
      setKeepKeyWallet(keepKey)
      const bootloaderVersion = getBootloaderVersion(keepKey, releases)
      const latestBootloader = releases.latest.bootloader.version
      const deviceFirmware = await keepKey.getFirmwareVersion()
      const latestFirmware = releases.latest.firmware.version

      const versions: Versions = {
        bootloader: {
          device: bootloaderVersion,
          latest: latestBootloader,
          updateAvailable: bootloaderVersion !== latestBootloader
        },
        firmware: {
          device: deviceFirmware,
          latest: latestFirmware,
          updateAvailable: deviceFirmware !== latestFirmware
        }
      }
      setVersions(versions)
    })()
  }, [isKeepKey, wallet])

  return { wallet: keepKeyWallet, versions, keyring }
}
