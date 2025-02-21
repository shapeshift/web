// Service CSPs
import { csp as alchemy } from './alchemy'
// Asset Service CSPs
import { csp as trustwallet } from './assetService/trustwallet'
import { csp as base } from './base'
import { csp as chainflip } from './chainflip'
// Chain CSPs
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
import { csp as optimism } from './chains/optimism'
import { csp as polygon } from './chains/polygon'
import { csp as solana } from './chains/solana'
import { csp as thorchain } from './chains/thorchain'
import { csp as unstoppable } from './chains/unstoppable'
import { csp as chatwoot } from './chatwoot'
import { csp as customTokenImport } from './customTokenImport'
// DeFi CSPs
import { csp as foxy } from './defi/foxy'
import { csp as idle } from './defi/idle'
import { csp as mtpelerin } from './defi/mtpelerin'
import { csp as safe } from './defi/safe'
// DeFi Swapper CSPs
import { csp as zeroX } from './defi/swappers/0x'
import { csp as cowSwap } from './defi/swappers/CowSwap'
import { csp as lifi } from './defi/swappers/Lifi'
import { csp as oneInch } from './defi/swappers/OneInch'
import { csp as portals } from './defi/swappers/Portals'
import { csp as thor } from './defi/swappers/Thor'
import { csp as yearn } from './defi/yearn'
import { csp as interFont } from './InterFont'
// Plugin CSPs
import { csp as foxPage } from './plugins/foxPage'
import { csp as walletConnectToDapps } from './plugins/walletConnectToDapps'
// Wallet CSPs
import { csp as coinbase } from './wallets/coinbase'
import { csp as keepkey } from './wallets/keepkey'
import { csp as metamask } from './wallets/metamask'
import { csp as walletConnect } from './wallets/walletConnect'
import { csp as walletMigration } from './wallets/walletMigration'

export const csps = [
  // Base CSP (should be first as it contains default rules)
  base,

  // Service CSPs
  alchemy,
  chainflip,
  chatwoot,
  customTokenImport,
  interFont,

  // Chain CSPs
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
  thorchain,
  unstoppable,

  // Asset Service CSPs
  trustwallet,

  // DeFi CSPs
  foxy,
  idle,
  mtpelerin,
  safe,
  yearn,

  // DeFi Swapper CSPs
  zeroX,
  cowSwap,
  lifi,
  oneInch,
  portals,
  thor,

  // Plugin CSPs
  foxPage,
  walletConnectToDapps,

  // Wallet CSPs
  coinbase,
  keepkey,
  metamask,
  walletConnect,
  walletMigration,
]
