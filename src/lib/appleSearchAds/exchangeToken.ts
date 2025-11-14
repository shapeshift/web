/**
 * Exchange Apple Search Ads attribution token with Apple's API
 *
 * This function attempts to call Apple's AdServices Attribution API directly from the browser.
 * Note: This may fail due to CORS restrictions. If it does, the mobile app will need to
 * exchange the token instead.
 *
 * @param token - The attribution token from AAAttribution.attributionToken()
 * @returns The attribution data from Apple, or null if the request fails
 */
export async function exchangeAppleSearchAdsToken(
  token: string,
): Promise<AppleSearchAdsAttributionData | null> {
  try {
    const response = await fetch('https://api-adservices.apple.com/api/v1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: token,
    })

    if (!response.ok) {
      console.error('Apple Attribution API request failed:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    return data as AppleSearchAdsAttributionData
  } catch (error) {
    // This will likely be a CORS error if Apple doesn't allow browser requests
    console.error('Failed to exchange Apple Search Ads token:', error)
    return null
  }
}

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
