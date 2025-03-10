import type { Features } from '@keepkey/device-protocol/lib/messages_pb'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import semverGte from 'semver/functions/gte'

import { getConfig } from '@/config'
import {
  MINIMUM_KK_FIRMWARE_VERSION_SUPPORTING_EIP712,
  MINIMUM_KK_FIRMWARE_VERSION_SUPPORTING_LITECOIN,
} from '@/constants/Config'
import { isKeepKeyHDWallet } from '@/lib/utils'

type VersionUrl = {
  version: string
  url: string
}

export type FirmwareDetails = {
  bootloader: VersionUrl
  firmware: VersionUrl
}

type FirmwareReleases = {
  latest: FirmwareDetails
  hashes: {
    bootloader: Record<string, string>
    firmware: Record<string, string>
  }
  links: {
    updater: string
  }
}

type VersionStatus = {
  device: string
  latest: string
  updateAvailable: boolean
}

type Versions = {
  bootloader: VersionStatus
  firmware: VersionStatus
}

const getBootloaderVersion = (releases: FirmwareReleases, features: Features.AsObject): string => {
  const hash = features?.bootloaderHash.toString() ?? ''
  const buffer = Buffer.from(hash, 'base64')
  const hex = buffer.toString('hex')
  return releases.hashes.bootloader[hex.toLowerCase()]
}

export type VersionsData = {
  versions: Versions
  updaterUrl: string
  isLTCSupportedFirmwareVersion: boolean
  isEIP712SupportedFirmwareVersion: boolean
  latestFirmware: string
}

export const useKeepKeyVersions = ({ wallet }: { wallet: HDWallet | null }) => {
  const isKeepKey = !!wallet && isKeepKeyHDWallet(wallet)

  const featuresQuery = useQuery({
    queryKey: ['keepKeyFeatures', wallet?.getDeviceID()],
    queryFn: async () => {
      if (!wallet) throw new Error('Wallet not available')
      return await wallet.getFeatures()
    },
    staleTime: 0,
    gcTime: 0,
    enabled: isKeepKey,
  })

  const deviceFirmwareQuery = useQuery({
    queryKey: ['keepKeyFirmware', wallet?.getDeviceID()],
    queryFn: async () => {
      if (!wallet) throw new Error('Wallet not available')
      return await wallet.getFirmwareVersion()
    },
    staleTime: 0,
    gcTime: 0,
    enabled: isKeepKey,
  })

  const stableDesktopVersionQuery = useQuery({
    queryKey: ['keepKeyDesktopVersion'],
    queryFn: async () => {
      try {
        const response = await axios.get(
          'https://api.github.com/repos/keepkey/keepkey-desktop/releases/latest',
        )
        if (response.data && response.data.tag_name) {
          // Remove 'v' prefix if present
          return response.data.tag_name.replace(/^v/, '')
        }
        return null
      } catch (error) {
        console.error('Failed to fetch latest stable KeepKey Desktop version:', error)
        return null
      }
    },
  })

  const versionsQuery = useQuery({
    queryKey: ['keepKeyVersions', wallet?.getDeviceID()],
    queryFn: isKeepKey
      ? async () => {
          try {
            const { data: releases } = await axios.get<FirmwareReleases>(
              getConfig().VITE_KEEPKEY_VERSIONS_URL,
              {
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              },
            )

            return releases
          } catch (error) {
            console.error('Error fetching KeepKey versions:', error)
            throw error
          }
        }
      : skipToken,
    select: (releases: FirmwareReleases): VersionsData | null => {
      const features = featuresQuery.data as Features.AsObject
      const deviceFirmware = deviceFirmwareQuery.data

      if (!features || !deviceFirmware) return null

      const bootloaderVersion = getBootloaderVersion(releases, features)
      const latestBootloader = releases.latest.bootloader.version
      const latestFirmware = releases.latest.firmware.version

      const isLTCSupportedFirmwareVersion = semverGte(
        deviceFirmware,
        MINIMUM_KK_FIRMWARE_VERSION_SUPPORTING_LITECOIN,
      )
      const isEIP712SupportedFirmwareVersion = semverGte(
        deviceFirmware,
        MINIMUM_KK_FIRMWARE_VERSION_SUPPORTING_EIP712,
      )

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

      return {
        versions,
        updaterUrl: getConfig().VITE_KEEPKEY_UPDATER_RELEASE_PAGE,
        isLTCSupportedFirmwareVersion,
        isEIP712SupportedFirmwareVersion,
        latestFirmware,
      }
    },
  })

  return {
    stableDesktopVersionQuery,
    versionsQuery,
    featuresQuery,
    deviceFirmwareQuery,
  }
}
