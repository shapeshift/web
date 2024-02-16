import type { NftItem } from './types'

// List of domains to check for
// Try to be as broad as possible vs. specific here to accommodate for diff. TLDs and subdomains
const NFT_DOMAINS_BLACKLIST = ['ethercb']
const NFT_NAME_BLACKLIST = [
  'voucher',
  'airdrop',
  'giveaway',
  'promo',
  'airdrop',
  'reward',
  'ticket',
  'winner',
  '$',
  'pirategirls',
  'USDC',
  'USDT',
  'calim cryptopunk',
  'coupon',
  'bonus',
  'claim',
  'etherscan',
  'shibarium',
  ' ETH',
  'gift',
  'event',
  'mint pass',
  'ethstation',
  'jrnyclubnet',
  'jrnyclub.net',
  '://',
  "'",
]

// This checks for whitespace only, url scheme, domain extension, non printable control characters and any explicit spam text not caught by the previous patterns
const TOKEN_TEXT_REGEX_BLACKLIST = [
  // eslint-disable-next-line no-control-regex
  /[\x00-\x1F\x7F-\x9F]/,
  /^\s*$/,
  /:\/\//,
  /[.,][a-zA-Z]{2,4}/,
  /ETH\.\.\./,
]

// This checks for domain extension and non printable control characters
// eslint-disable-next-line no-control-regex
const NFT_TEXT_REGEX_BLACKLIST = [/[\x00-\x1F\x7F-\x9F]/, /[.,][a-zA-Z]{2,4}/]

// This escapes special characters we may encounter in NFTS, so we can add them to the blacklist
// e.g "$9999+ free giveaway *limited time only*" would not work without it
const nftNameBlacklistRegex = new RegExp(
  NFT_NAME_BLACKLIST.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
)
export const isSpammyNftText = (nftText: string, excludeEmpty?: boolean) => {
  const isEmptyText = Boolean(excludeEmpty && /^\s*$/.test(nftText))
  const isSpammyMatch = nftNameBlacklistRegex.test(nftText)
  const isRegexBlacklistMatch = NFT_TEXT_REGEX_BLACKLIST.some(regex => regex.test(nftText))
  return isEmptyText || isSpammyMatch || isRegexBlacklistMatch
}
export const isSpammyTokenText = (tokenText: string) =>
  TOKEN_TEXT_REGEX_BLACKLIST.some(regex => regex.test(tokenText))
const isSpammyDomain = (domain: string) =>
  NFT_DOMAINS_BLACKLIST.some(blacklistedDomain => domain.includes(blacklistedDomain))
export const hasSpammyMedias = (medias: NftItem['medias']) =>
  medias.some(media => isSpammyDomain(media.originalUrl))
export const BLACKLISTED_COLLECTION_IDS = [
  'eip155:137/erc1155:0x30825b65e775678997c7fbc5831ab492c697448e',
  'eip155:137/erc1155:0x4217495f2a128da8d6122d120a1657753823721a',
  'eip155:137/erc1155:0x54e75b47353a5ded078d8eb6ba67ff01a2a18ef7',
  'eip155:137/erc1155:0x7d33048b74c24d695d349e73a59b7de3ed50c4c0',
  'eip155:137/erc1155:0xb1cfea0eb0f67a50b896985bda6368fc1c21907b',
  'eip155:137/erc1155:0xc165d899628c5fd74e19c91de596a9ea2f3599ec',
  'eip155:137/erc1155:0xcf2576238640a3a232fa6046d549dfb753a805f4',
  'eip155:137/erc1155:0xcf63b89da7c6ada007fbef13fa1e8453756ba7a6',
  'eip155:137/erc1155:0xda8091a96aefcc2bec5ed64eb2e18008ebf7806c',
  'eip155:137/erc1155:0xe0b7dafe2eb86ad56386676a61781d863144db1e',
  'eip155:137/erc1155:0xed13387ea51efb26b1281bd6decc352141fd312a',
  'eip155:137/erc1155:0xf02521228c6250b255abbc4ea66fd5aa86aa2ce0',
  'eip155:137/erc1155:0xf30437ad7d081046b4931e29460fcb0d7bbaca46',
  'eip155:137/erc1155:0xfd920bd499511d0f5e37b4405a7986a4d6f1abe3',
  'eip155:137/erc1155:0x55d50a035bc5830dac9f1a42b71c48cbad568d60',
  'eip155:137/erc1155:0x5620a667cbe1eb7e1e27087d135881a546456ebb',
  'eip155:137/erc1155:0x1b6ff968f954fef75a82c0f47364eb00c3643d17',
  'eip155:137/erc1155:0x5df82d6f8dc0a697d2785953a40735b33e3b1f50',
  'eip155:137/erc1155:0x71c7c713aaf6b129ebeb29d00647b6cc39e4f9f9',
  'eip155:137/erc1155:0xabda1f46fe8ad6b08aa9505702144522c511038f',
]
