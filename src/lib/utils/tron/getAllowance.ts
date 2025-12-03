import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { TronWeb } from 'tronweb'

import { assertGetTronChainAdapter } from '..'

type GetTrc20AllowanceArgs = {
  address: string
  spender: string
  from: string
  chainId: ChainId
}

export const getTrc20Allowance = async ({
  address,
  spender,
  from,
  chainId,
}: GetTrc20AllowanceArgs): Promise<string> => {
  const adapter = assertGetTronChainAdapter(chainId)
  const rpcUrl = adapter.httpProvider.getRpcUrl()

  // Encode parameters for allowance(address,address)
  // TronWeb.address.toHex returns 41-prefixed hex (e.g., 41af46...)
  // We need to remove the 41 prefix to get the 20-byte address
  const ownerHex = TronWeb.address.toHex(from).replace(/^41/, '')
  const spenderHex = TronWeb.address.toHex(spender).replace(/^41/, '')

  // Pad to 32 bytes (64 hex chars) each
  const parameter = ownerHex.padStart(64, '0') + spenderHex.padStart(64, '0')

  const response = await fetch(`${rpcUrl}/wallet/triggerconstantcontract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner_address: from,
      contract_address: address,
      function_selector: 'allowance(address,address)',
      parameter,
      visible: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to query TRC-20 allowance: ${response.statusText}`)
  }

  const result = await response.json()

  if (!result.constant_result?.[0]) {
    throw new Error('Invalid response from TRON node when querying allowance')
  }

  // Decode uint256 from hex
  const allowanceHex = result.constant_result[0]
  const allowance = BigInt('0x' + allowanceHex)

  return allowance.toString()
}

type GetAllowanceInput = {
  assetId: AssetId
  spender: string
  from: string
}

export const getAllowance = ({ assetId, spender, from }: GetAllowanceInput): Promise<string> => {
  const { assetReference, chainId } = fromAssetId(assetId)

  return getTrc20Allowance({
    address: assetReference,
    spender,
    from,
    chainId,
  })
}
