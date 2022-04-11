import axios from 'axios'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

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
  const {
    keepKeyWallet,
    state: { features },
  } = useKeepKey()

  useEffect(() => {
    if (!keepKeyWallet) return

    const getBootloaderVersion = (releases: FirmwareReleases): string => {
      const hash = features?.bootloaderHash.toString() ?? ''
      const buffer = Buffer.from(hash, 'base64')
      const hex = buffer.toString('hex')
      return releases.hashes.bootloader[hex.toLowerCase()]
    }

    ;(async () => {
      const { data: releases } = await axios.get<FirmwareReleases>(
        getConfig().REACT_APP_KEEPKEY_VERSIONS_URL,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      )

      const bootloaderVersion = getBootloaderVersion(releases)
      const latestBootloader = releases.latest.bootloader.version
      const deviceFirmware = await keepKeyWallet.getFirmwareVersion()
      const latestFirmware = releases.latest.firmware.version

      const versions: Versions = {
        bootloader: {
          device: bootloaderVersion,
          latest: latestBootloader,
          updateAvailable: bootloaderVersion !== latestBootloader,
        },
        firmware: {
          device: deviceFirmware,
          latest: latestFirmware,
          updateAvailable: deviceFirmware !== latestFirmware,
        },
      }
      setVersions(versions)
    })()
  }, [features?.bootloaderHash, keepKeyWallet])

  return versions
}
