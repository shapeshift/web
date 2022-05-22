export type OtherOpportunity = {
  title: string
  apy: string
  link: string
  images: string[]
}

export type FoxOpportunities = {
  liquidityPools?: OtherOpportunity[]
  farming?: OtherOpportunity[]
  borrowingAndLending?: OtherOpportunity[]
}
