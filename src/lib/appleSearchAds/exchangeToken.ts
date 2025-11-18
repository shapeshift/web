export async function exchangeAppleSearchAdsToken(
  token: string,
): Promise<AppleSearchAdsAttributionData | null> {
  if (!token) throw new Error('No Apple Search Ads attribution token provided')

  try {
    const response = await fetch('https://api-adservices.apple.com/api/v1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: token,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to exchange Apple Search Ads token: ${response.status} ${response.statusText}`,
      )
    }

    const data = await response.json()
    alert(JSON.stringify({ data }))
    return data as AppleSearchAdsAttributionData
  } catch (error) {
    alert(JSON.stringify({ error }))
    throw new Error(`Failed to exchange Apple Search Ads token: ${error}`)
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
