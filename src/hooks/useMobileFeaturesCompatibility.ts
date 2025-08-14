import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import semver from 'semver'

import { requestAppVersion } from '../context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { isMobile } from '../lib/globals'

export enum MobileFeature {
  RatingModal = 'rating-modal',
}

export const minimumMobileFeatureMinimumVersions: Record<MobileFeature, string> = {
  [MobileFeature.RatingModal]: '3.3.1',
}

type MobileFeatureInfo = {
  version: string | undefined
  isCompatible: boolean
}

type MobileFeaturesMap = Record<MobileFeature, MobileFeatureInfo>

export const useMobileFeaturesCompatibility = (): MobileFeaturesMap => {
  const { data: mobileAppVersion } = useQuery({
    queryKey: ['mobile-features-versions'],
    queryFn: requestAppVersion,
  })

  const features = useMemo((): MobileFeaturesMap => {
    return Object.values(MobileFeature).reduce((acc, feature) => {
      acc[feature] = {
        version: mobileAppVersion?.version,
        isCompatible:
          !isMobile ||
          Boolean(
            mobileAppVersion?.version &&
              semver.gte(mobileAppVersion.version, minimumMobileFeatureMinimumVersions[feature]),
          ),
      }

      return acc
    }, {} as MobileFeaturesMap)
  }, [mobileAppVersion])

  return features
}
