import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import axios from 'axios'
import { useEffect, useState } from 'react'
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

const isKeepKeyWallet = (wallet: HDWallet | null): wallet is KeepKeyHDWallet => {
  return (wallet as KeepKeyHDWallet)._isKeepKey
}

export const useKeepKeyWallet = () => {
  const { state: walletState } = useWallet()
  const { wallet, keyring } = walletState
  const [keepKeyWallet, setKeepKeyWallet] = useState<KeepKeyHDWallet | undefined>()
  const [pinCaching, setPinCaching] = useState<boolean>()
  const [passphrase, setPassphrase] = useState<boolean>()
  const [versions, setVersions] = useState<Versions>()

  const getBootloaderVersion = (keepKey: KeepKeyHDWallet, releases: FirmwareReleases): string => {
    const hash = keepKey.features?.bootloaderHash.toString() ?? ''
    const buffer = Buffer.from(hash, 'base64')
    const hex = buffer.toString('hex')
    return releases.hashes.bootloader[hex.toLowerCase()]
  }

  useEffect(() => {
    if (!isKeepKeyWallet(wallet)) return
    ;(async () => {
      setKeepKeyWallet(wallet)
      setPassphrase(wallet.features?.passphraseProtection)
      setPinCaching(
        wallet?.features?.policiesList.find(p => p.policyName === 'Pin Caching')?.enabled
      )

      const { data: releases } = await axios.get<FirmwareReleases>(
        'https://storageapi.fleek.co/081e91ad-2088-4280-97c5-e3174231ecab-bucket/keepKey.json',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )

      const bootloaderVersion = getBootloaderVersion(wallet, releases)
      const latestBootloader = releases.latest.bootloader.version
      const deviceFirmware = await wallet.getFirmwareVersion()
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
  }, [wallet])

  return {
    wallet: keepKeyWallet,
    versions,
    keyring,
    pinCaching,
    passphrase
  }
}
