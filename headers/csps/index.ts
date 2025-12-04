import { csp as addressable } from './addressable'
import { csp as alchemy } from './alchemy'
import { csp as trustwallet } from './assetService/trustwallet'
import { csp as base } from './base'
import { csp as chainflip } from './chainflip'
import { csp as arbitrum } from './chains/arbitrum'
import { csp as arbitrumNova } from './chains/arbitrumNova'
import { csp as avalanche } from './chains/avalanche'
import { csp as baseChain } from './chains/base'
import { csp as bitcoin } from './chains/bitcoin'
import { csp as bitcoincash } from './chains/bitcoincash'
import { csp as bnbsmartchain } from './chains/bnbsmartchain'
import { csp as cosmos } from './chains/cosmos'
import { csp as dogecoin } from './chains/dogecoin'
import { csp as ethereum } from './chains/ethereum'
import { csp as gnosis } from './chains/gnosis'
import { csp as litecoin } from './chains/litecoin'
import { csp as mayachain } from './chains/mayachain'
import { csp as monad } from './chains/monad'
import { csp as optimism } from './chains/optimism'
import { csp as plasma } from './chains/plasma'
import { csp as polygon } from './chains/polygon'
import { csp as solana } from './chains/solana'
import { csp as sui } from './chains/sui'
import { csp as thorchain } from './chains/thorchain'
import { csp as tron } from './chains/tron'
import { csp as chatwoot } from './chatwoot'
import { csp as customTokenImport } from './customTokenImport'
import { csp as foxy } from './defi/foxy'
import { csp as idle } from './defi/idle'
import { csp as mtpelerin } from './defi/mtpelerin'
import { csp as safe } from './defi/safe'
import { csp as zeroX } from './defi/swappers/0x'
import { csp as bebop } from './defi/swappers/Bebop'
import { csp as butterSwap } from './defi/swappers/ButterSwap'
import { csp as cowSwap } from './defi/swappers/CowSwap'
import { csp as nearIntents } from './defi/swappers/NearIntents'
import { csp as oneInch } from './defi/swappers/OneInch'
import { csp as portals } from './defi/swappers/Portals'
import { csp as thor } from './defi/swappers/Thor'
import { csp as discord } from './discord'
import { csp as banxa } from './fiatRamps/banxa'
import { csp as onRamper } from './fiatRamps/onRamper'
import { csp as interFont } from './InterFont'
import { csp as jupiter } from './jupiter'
import { csp as ledger } from './ledger'
import { csp as coincap } from './marketService/coincap'
import { csp as exchangeRates } from './marketService/exchangeRates'
import { csp as mercle } from './mercle'
import { csp as mixPanel } from './mixPanel'
import { csp as moralis } from './moralis'
import { csp as foxPage } from './plugins/foxPage'
import { csp as walletConnectToDapps } from './plugins/walletConnectToDapps'
import { csp as railway } from './railway'
import { csp as relay } from './relay'
import { csp as sentry } from './sentry'
import { csp as shapeshiftGateway } from './shapeshiftGateway'
import { csp as shapeshiftProxy } from './shapeshiftProxy'
import { csp as snapshots } from './snapshots'
import { csp as tenderly } from './tenderly'
import { csp as trezor } from './trezor'
import { csp as coinbase } from './wallets/coinbase'
import { csp as gridplus } from './wallets/gridplus'
import { csp as keepkey } from './wallets/keepkey'
import { csp as metamask } from './wallets/metamask'
import { csp as walletConnect } from './wallets/walletConnect'
import { csp as walletMigration } from './wallets/walletMigration'
import { csp as webflow } from './webflow'

export const csps = [
  base,
  addressable,
  alchemy,
  moralis,
  chainflip,
  chatwoot,
  customTokenImport,
  interFont,
  jupiter,
  ledger,
  trezor,
  mercle,
  mixPanel,
  sentry,
  shapeshiftGateway,
  shapeshiftProxy,
  snapshots,
  tenderly,
  webflow,
  arbitrum,
  arbitrumNova,
  avalanche,
  baseChain,
  bitcoin,
  bitcoincash,
  bnbsmartchain,
  cosmos,
  dogecoin,
  ethereum,
  gnosis,
  litecoin,
  optimism,
  polygon,
  solana,
  sui,
  thorchain,
  tron,
  mayachain,
  monad,
  plasma,
  trustwallet,
  coincap,
  exchangeRates,
  onRamper,
  banxa,
  foxy,
  idle,
  mtpelerin,
  safe,
  zeroX,
  bebop,
  cowSwap,
  nearIntents,
  oneInch,
  portals,
  thor,
  butterSwap,
  foxPage,
  walletConnectToDapps,
  coinbase,
  gridplus,
  keepkey,
  metamask,
  walletConnect,
  walletMigration,
  relay,
  railway,
  discord,
]
