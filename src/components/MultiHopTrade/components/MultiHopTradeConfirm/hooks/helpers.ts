import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { type evm, type EvmChainAdapter, evmChainIds } from '@shapeshiftoss/chain-adapters'
import { type ETHWallet, type HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import { assertGetChainAdapter } from 'lib/utils'
import { getApproveContractData, getErc20Allowance, getFees } from 'lib/utils/evm'

export type GetAllowanceArgs = {
  accountNumber: number
  allowanceContract: string
  chainId: ChainId
  assetId: AssetId
  wallet: HDWallet
  accountId: AccountId
}

export enum GetAllowanceErr {
  NotEVMChain = 'NotEVMChain',
  IsFeeAsset = 'IsFeeAsset',
  MissingArgs = 'MissingArgs',
}

export const getAllowance = async ({
  accountNumber,
  allowanceContract,
  chainId,
  assetId,
  wallet,
  accountId,
}: GetAllowanceArgs): Promise<Result<string, GetAllowanceErr>> => {
  const adapter = assertGetChainAdapter(chainId)

  if (!wallet) throw new Error('no wallet available')

  // No approval needed for selling a non-EVM asset
  if (!evmChainIds.includes(chainId as EvmChainId)) {
    return Err(GetAllowanceErr.NotEVMChain)
  }

  // No approval needed for selling a fee asset
  if (assetId === adapter.getFeeAssetId()) {
    return Err(GetAllowanceErr.IsFeeAsset)
  }

  const fetchUnchainedAddress = Boolean(wallet && isLedger(wallet))
  const from = await adapter.getAddress({
    wallet,
    accountNumber,
    pubKey: fetchUnchainedAddress ? fromAccountId(accountId).account : undefined,
  })

  const { assetReference: sellAssetContractAddress } = fromAssetId(assetId)

  const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
    address: sellAssetContractAddress,
    spender: allowanceContract,
    from,
    chainId,
  })

  return Ok(allowanceOnChainCryptoBaseUnit)
}

export const getApprovalTxData = async ({
  tradeQuoteStep,
  adapter,
  wallet,
  isExactAllowance,
  from,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  adapter: EvmChainAdapter
  wallet: ETHWallet
  isExactAllowance: boolean
  from?: string
}): Promise<{ buildCustomTxInput: evm.BuildCustomTxInput; networkFeeCryptoBaseUnit: string }> => {
  const approvalAmountCryptoBaseUnit = isExactAllowance
    ? tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
    : MAX_ALLOWANCE

  const { assetReference } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const value = '0'

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit,
    spender: tradeQuoteStep.allowanceContract,
    to: assetReference,
    chainId: tradeQuoteStep.sellAsset.chainId,
  })

  const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
    adapter,
    to: assetReference,
    value,
    data,
    ...(from
      ? {
          from,
          supportsEIP1559: await wallet.ethSupportsEIP1559(),
        }
      : { accountNumber: tradeQuoteStep.accountNumber, wallet }),
  })

  return {
    networkFeeCryptoBaseUnit,
    buildCustomTxInput: {
      accountNumber: tradeQuoteStep.accountNumber,
      data,
      to: assetReference,
      value,
      wallet,
      ...fees,
    },
  }
}
