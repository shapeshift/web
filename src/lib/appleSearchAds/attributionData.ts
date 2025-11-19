export type AppleSearchAdsAttributionData = {
  attribution?: boolean
  orgId?: number
  campaignId?: number
  conversionType?: 'Download' | 'Redownload'
  clickDate?: string
  adGroupId?: number
  countryOrRegion?: string
  keywordId?: number
  adId?: number
  claimType?: 'Click' | 'View'
}
