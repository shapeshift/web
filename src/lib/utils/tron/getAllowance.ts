import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'

import { assertGetTronChainAdapter } from './adapter'

type GetTrc20AllowanceArgs = {
  address: string
  spender: string
  from: string
  chainId: ChainId
}

export const getTrc20Allowance = ({
  address,
  spender,
  from,
  chainId,
}: GetTrc20AllowanceArgs): Promise<string> => {
  return assertGetTronChainAdapter(chainId).httpProvider.getTrc20Allowance({
    contractAddress: address,
    owner: from,
    spender,
  })
}

type GetAllowanceInput = {
  assetId: AssetId
  spender: string
  from: string
}

export const getAllowance = ({ assetId, spender, from }: GetAllowanceInput): Promise<string> => {
  const { assetReference, chainId } = fromAssetId(assetId)

  return getTrc20Allowance({ address: assetReference, spender, from, chainId })
}
