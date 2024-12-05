import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import type { QuoteResponse, SwapInstructionsResponse } from '@jup-ag/api'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type { Connection } from '@solana/web3.js'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import {
  JUPITER_REFERALL_FEE_PROJECT_ACCOUNT,
  jupiterSupportedChainIds,
  SHAPESHIFT_JUPITER_REFERRAL_KEY,
} from './constants'
import { jupiterService } from './jupiterService'

export const isSupportedChainId = (chainId: ChainId): chainId is KnownChainIds.SolanaMainnet => {
  return jupiterSupportedChainIds.includes(chainId)
}

const JUPITER_TRANSACTION_MAX_ACCOUNTS = 54

type GetJupiterQuoteArgs = {
  apiUrl: string
  sourceAsset: string
  destinationAsset: string
  commissionBps: string
  amount: string
  slippageBps: string | undefined
}

type GetJupiterSwapArgs = {
  apiUrl: string
  fromAddress: string
  rawQuote: unknown
  toAddress?: string
  useSharedAccounts: boolean
  feeAccount: string | undefined
}

export const getJupiterPrice = ({
  apiUrl,
  sourceAsset,
  destinationAsset,
  commissionBps,
  amount,
  slippageBps,
}: GetJupiterQuoteArgs): Promise<Result<AxiosResponse<QuoteResponse, any>, SwapErrorRight>> =>
  jupiterService.get<QuoteResponse>(
    `${apiUrl}/quote` +
      `?inputMint=${fromAssetId(sourceAsset).assetReference}` +
      `&outputMint=${fromAssetId(destinationAsset).assetReference}` +
      `&amount=${amount}` +
      (slippageBps ? `&slippageBps=${slippageBps}` : `&autoSlippage=true`) +
      `&maxAccounts=${JUPITER_TRANSACTION_MAX_ACCOUNTS}` +
      `&platformFeeBps=${commissionBps}`,
  )

export const getJupiterSwapInstructions = ({
  apiUrl,
  fromAddress,
  toAddress,
  rawQuote,
  useSharedAccounts,
  feeAccount,
}: GetJupiterSwapArgs): Promise<
  Result<AxiosResponse<SwapInstructionsResponse, any>, SwapErrorRight>
> =>
  jupiterService.post<SwapInstructionsResponse>(`${apiUrl}/swap-instructions`, {
    userPublicKey: fromAddress,
    destinationTokenAccount: toAddress,
    useSharedAccounts,
    quoteResponse: rawQuote,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
    feeAccount,
  })

export const getFeeTokenAccountAndInstruction = async ({
  feePayerPubKey,
  programId,
  buyAssetReferralPubKey,
  sellAssetReferralPubKey,
  buyTokenId,
  sellTokenId,
  instructionData,
  connection,
}: {
  feePayerPubKey: PublicKey
  programId: PublicKey
  buyAssetReferralPubKey: PublicKey
  sellAssetReferralPubKey: PublicKey
  buyTokenId: string
  sellTokenId: string
  instructionData: Buffer
  connection: Connection
}): Promise<{
  tokenAccount?: PublicKey
  instruction?: TransactionInstruction | undefined
}> => {
  const sellAssetTokenAccount = await connection.getAccountInfo(sellAssetReferralPubKey)

  if (sellAssetTokenAccount) return { tokenAccount: sellAssetReferralPubKey }

  const buyAssetTokenAccount = await connection.getAccountInfo(buyAssetReferralPubKey)

  if (buyAssetTokenAccount) return { tokenAccount: buyAssetReferralPubKey }

  const buyTokenInfo = await connection.getAccountInfo(new PublicKey(buyTokenId))
  const sellTokenInfo = await connection.getAccountInfo(new PublicKey(sellTokenId))

  if (
    buyTokenInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toString() &&
    sellTokenInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toString()
  ) {
    return { tokenAccount: undefined, instruction: undefined }
  }

  const project = new PublicKey(JUPITER_REFERALL_FEE_PROJECT_ACCOUNT)

  return {
    tokenAccount: sellAssetReferralPubKey,
    instruction: new TransactionInstruction({
      keys: [
        {
          pubkey: feePayerPubKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: project,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: new PublicKey(SHAPESHIFT_JUPITER_REFERRAL_KEY),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: sellAssetReferralPubKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(buyTokenId),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: instructionData,
      programId,
    }),
  }
}
