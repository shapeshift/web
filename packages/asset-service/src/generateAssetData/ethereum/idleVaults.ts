import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { IdleSdk, IdleVault } from '@shapeshiftoss/investor-idle'
import toLower from 'lodash/toLower'

import { Asset } from '../../service/AssetService'
import { ethereum } from '../baseAssets'
import { colorMap } from '../colorMap'

// const network = 1 // 1 for mainnet
// const provider = new JsonRpcProvider(process.env.REACT_APP_ETHEREUM_NODE_URL)

const idleSdk = new IdleSdk()

const explorerData = {
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink
}

const getIdleVaults = async (): Promise<Asset[]> => {
  const vaults: IdleVault[] = await idleSdk.getVaults()

  return vaults.map((vault: IdleVault) => {
    const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: vault.address })
    const displayIcon = `https://raw.githubusercontent.com/Idle-Labs/idle-dashboard/master/public/images/tokens/${vault.tokenName}.svg`
    return {
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: displayIcon,
      name: vault.poolName,
      precision: Number(18),
      symbol: vault.tokenName,
      tokenId: toLower(vault.address),
      chainId,
      assetId,
      ...explorerData
    }
  })
}

const getUnderlyingVaultTokens = async (): Promise<Asset[]> => {
  const vaults: IdleVault[] = await idleSdk.getVaults()

  return vaults.map((vault: IdleVault) => {
    const assetId = toAssetId({
      chainId,
      assetNamespace: 'erc20',
      assetReference: vault.underlyingAddress
    })

    return {
      ...explorerData,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: '',
      name: vault.tokenName,
      precision: Number(18),
      symbol: vault.tokenName,
      chainId,
      assetId
    }
  })
}

export const getIdleTokens = async (): Promise<Asset[]> => {
  const [idleVaults, underlyingVaultTokens] = await Promise.all([
    getIdleVaults(),
    getUnderlyingVaultTokens()
  ])

  return [...idleVaults, ...underlyingVaultTokens]
}
