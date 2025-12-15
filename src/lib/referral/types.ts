export type ReferralCode = {
  code: string
  isActive: boolean
  createdAt: Date | string
  usageCount: number
  maxUses?: number | null
  expiresAt?: Date | string | null
  swapCount?: number
  swapVolumeUsd?: string
  feesCollectedUsd?: string
  referrerCommissionUsd?: string
}

export type ReferralStats = {
  totalReferrals: number
  activeCodesCount: number
  totalCodesCount: number
  totalFeesCollectedUsd?: string
  totalReferrerCommissionUsd?: string
  referralCodes: ReferralCode[]
}

export type CreateReferralCodeRequest = {
  code: string
  ownerAddress: string
  maxUses?: number
  expiresAt?: string
}

export type CreateReferralCodeResponse = {
  id: string
  code: string
  ownerAddress: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  maxUses?: number | null
  expiresAt?: string | null
}

export class ReferralApiError extends Error {
  code?: string
  statusCode?: number

  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'ReferralApiError'
    this.code = code
    this.statusCode = statusCode
  }
}
