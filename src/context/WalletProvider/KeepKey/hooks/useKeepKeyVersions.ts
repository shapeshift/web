import { isKeepKey, KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

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

export const useKeepKeyVersions = () => {
  const [versions, setVersions] = useState<Versions>()
  const { state } = useWallet()
  const { wallet } = state

  const getBootloaderVersion = (keepKey: KeepKeyHDWallet, releases: FirmwareReleases): string => {
    const hash = keepKey.features?.bootloaderHash.toString() ?? ''
    const buffer = Buffer.from(hash, 'base64')
    const hex = buffer.toString('hex')
    return releases.hashes.bootloader[hex.toLowerCase()]
  }

  useEffect(() => {
    if (!wallet || !isKeepKey(wallet)) return
    ;(async () => {
      const { data: releases } = await axios.get<FirmwareReleases>(
        // We'll need to update this whenever new firmware/bootloader is released.
        'https://bafybeied24gc2ipvlxdbs4v676dwho2l5aafmngrleic3do2czdvgb546u.ipfs.dweb.link/keepKey.json',
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

  return versions
}
