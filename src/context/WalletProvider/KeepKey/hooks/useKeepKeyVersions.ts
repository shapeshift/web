import { Features } from '@keepkey/device-protocol/lib/messages_pb'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import axios from 'axios'
import { getConfig } from 'config'
import keepkeyConfig from 'config/validators/wallets/keepkey'
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
  links: {
    updater: string
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
  const [updaterUrl, setUpdaterUrl] = useState<string>()
  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    if (!wallet || !(wallet instanceof KeepKeyHDWallet)) return

    const getBootloaderVersion = (
      releases: FirmwareReleases,
      features: Features.AsObject,
    ): string => {
      const hash = features?.bootloaderHash.toString() ?? ''
      const buffer = Buffer.from(hash, 'base64')
      const hex = buffer.toString('hex')
      return releases.hashes.bootloader[hex.toLowerCase()]
    }

    ;(async () => {
      const features = await wallet.getFeatures()
      const { data: releases } = await axios.get<FirmwareReleases>(
        getConfig(keepkeyConfig).REACT_APP_KEEPKEY_VERSIONS_URL,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      )

      const bootloaderVersion = getBootloaderVersion(releases, features)
      const latestBootloader = releases.latest.bootloader.version
      const deviceFirmware = await wallet.getFirmwareVersion()
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
      setUpdaterUrl(releases.links.updater)
    })()
  }, [wallet])

  return { versions, updaterUrl }
}
