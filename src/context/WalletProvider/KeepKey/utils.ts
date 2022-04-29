import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import axios from 'axios'
import { getConfig } from 'config'

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

interface VersionUrl {
  version: string
  url: string
}

interface VersionStatus {
  device: string
  latest: string
  updateAvailable: boolean
}

export interface Versions {
  bootloader: VersionStatus
  firmware: VersionStatus
}

export const getKeepKeyVersions = async (
  wallet: KeepKeyHDWallet | undefined,
  bootloaderHash: string | Uint8Array | undefined,
) => {
  if (!wallet) return

  const getBootloaderVersion = (releases: FirmwareReleases): string => {
    const hash = bootloaderHash?.toString() ?? ''
    const buffer = Buffer.from(hash, 'base64')
    const hex = buffer.toString('hex')
    return releases.hashes.bootloader[hex.toLowerCase()]
  }

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

  return versions
}
