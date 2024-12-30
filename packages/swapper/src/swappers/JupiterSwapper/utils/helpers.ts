import { BorshInstructionCoder } from '@coral-xyz/anchor'
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import type { Instruction, QuoteResponse, SwapInstructionsResponse } from '@jup-ag/api'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, solAssetId, wrappedSolAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters/src/solana'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import type { Connection } from '@solana/web3.js'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import type { AxiosError, AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import { referralIdl } from '../idls/referral'
import {
  JUPITER_AFFILIATE_CONTRACT_ADDRESS,
  JUPITER_REFERALL_FEE_PROJECT_ACCOUNT,
  jupiterSupportedChainIds,
  PDA_ACCOUNT_CREATION_COST,
  SHAPESHIFT_JUPITER_REFERRAL_KEY,
  TOKEN_2022_PROGRAM_ID,
} from './constants'
import { jupiterService } from './jupiterService'

export const isSupportedChainId = (chainId: ChainId): chainId is KnownChainIds.SolanaMainnet => {
  return jupiterSupportedChainIds.includes(chainId)
}

const JUPITER_TRANSACTION_MAX_ACCOUNTS = 54

type GetJupiterQuoteArgs = {
  apiUrl: string
  sourceAssetAddress: string
  destinationAssetAddress: string
  commissionBps: string
  amount: string
  slippageBps: string | undefined
}

type GetJupiterSwapArgs = {
  apiUrl: string
  fromAddress: string
  rawQuote: unknown
  toAddress?: string
  useSharedAccounts: boolean | undefined
  feeAccount: string | undefined
}

type CreateInstructionsParams = {
  priceResponse: QuoteResponse
  sendAddress: string
  receiveAddress?: string
  affiliateBps: string
  buyAsset: Asset
  sellAsset: any
  adapter: ChainAdapter
  jupiterUrl: string
}

export const getJupiterPrice = ({
  apiUrl,
  sourceAssetAddress,
  destinationAssetAddress,
  commissionBps,
  amount,
  slippageBps,
}: GetJupiterQuoteArgs): Promise<Result<AxiosResponse<QuoteResponse, any>, SwapErrorRight>> =>
  jupiterService.get<QuoteResponse>(
    `${apiUrl}/quote` +
      `?inputMint=${sourceAssetAddress}` +
      `&outputMint=${destinationAssetAddress}` +
      `&amount=${amount}` +
      (slippageBps ? `&slippageBps=${slippageBps}` : `&dynamicSlippage=true`) +
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
  const isSellTokenToken2022 = sellTokenInfo?.owner.toString() === TOKEN_2022_PROGRAM_ID.toString()

  if (
    buyTokenInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toString() &&
    sellTokenInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toString()
  ) {
    return { tokenAccount: undefined, instruction: undefined }
  }

  const project = new PublicKey(JUPITER_REFERALL_FEE_PROJECT_ACCOUNT)

  const referralPubkey = isSellTokenToken2022 ? buyAssetReferralPubKey : sellAssetReferralPubKey

  return {
    tokenAccount: referralPubkey,
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
          pubkey: referralPubkey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(isSellTokenToken2022 ? buyTokenId : sellTokenId),
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

export const calculateAccountCreationCosts = (instructions: TransactionInstruction[]): string => {
  let totalCost = bnOrZero(0)

  for (const ix of instructions) {
    if (ix.programId.toString() === ASSOCIATED_PROGRAM_ID.toString()) {
      if (ix.data?.[0] === 1) {
        totalCost = totalCost.plus(PDA_ACCOUNT_CREATION_COST)
      }
    }
  }

  return totalCost.toString()
}

export const createSwapInstructions = async ({
  priceResponse,
  sendAddress,
  receiveAddress,
  affiliateBps,
  buyAsset,
  sellAsset,
  adapter,
  jupiterUrl,
}: CreateInstructionsParams): Promise<{
  instructions: TransactionInstruction[]
  addressLookupTableAddresses: string[]
}> => {
  const isCrossAccountTrade = receiveAddress ? receiveAddress !== sendAddress : false

  const buyAssetAddress =
    buyAsset.assetId === solAssetId
      ? fromAssetId(wrappedSolAssetId).assetReference
      : fromAssetId(buyAsset.assetId).assetReference

  const sellAssetAddress =
    sellAsset.assetId === solAssetId
      ? fromAssetId(wrappedSolAssetId).assetReference
      : fromAssetId(sellAsset.assetId).assetReference

  const contractAddress =
    buyAsset.assetId === solAssetId ? undefined : fromAssetId(buyAsset.assetId).assetReference

  const { instruction: createTokenAccountInstruction, destinationTokenAccount } =
    contractAddress && isCrossAccountTrade
      ? await adapter.createAssociatedTokenAccountInstruction({
          from: sendAddress,
          to: receiveAddress!,
          tokenId: contractAddress,
        })
      : { instruction: undefined, destinationTokenAccount: undefined }

  const [buyAssetReferralPubKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('referral_ata'),
      new PublicKey(SHAPESHIFT_JUPITER_REFERRAL_KEY).toBuffer(),
      new PublicKey(buyAssetAddress).toBuffer(),
    ],
    new PublicKey(JUPITER_AFFILIATE_CONTRACT_ADDRESS),
  )

  const [sellAssetReferralPubKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('referral_ata'),
      new PublicKey(SHAPESHIFT_JUPITER_REFERRAL_KEY).toBuffer(),
      new PublicKey(sellAssetAddress).toBuffer(),
    ],
    new PublicKey(JUPITER_AFFILIATE_CONTRACT_ADDRESS),
  )

  const instructionData = new BorshInstructionCoder(referralIdl).encode(
    'initializeReferralTokenAccount',
    {},
  )

  const { instruction: feeAccountInstruction, tokenAccount } =
    await getFeeTokenAccountAndInstruction({
      feePayerPubKey: new PublicKey(sendAddress),
      buyAssetReferralPubKey,
      sellAssetReferralPubKey,
      programId: new PublicKey(JUPITER_AFFILIATE_CONTRACT_ADDRESS),
      instructionData,
      buyTokenId: buyAssetAddress,
      sellTokenId: sellAssetAddress,
      connection: adapter.getConnection(),
    })

  const maybeSwapResponse = await getJupiterSwapInstructions({
    apiUrl: jupiterUrl,
    fromAddress: sendAddress,
    toAddress: isCrossAccountTrade ? destinationTokenAccount?.toString() : undefined,
    rawQuote: priceResponse,
    // It would be better to use this only if routes number are > 1 and for cross account trades,
    // but Jupiter has a bug under the hood when swapping SPL to Token2022 and taking referral fees
    // Also it reduce sol numbers and compute units in the end, so TXs fees are smaller
    useSharedAccounts: isCrossAccountTrade ? true : undefined,
    feeAccount: affiliateBps !== '0' && tokenAccount ? tokenAccount.toString() : undefined,
  })

  if (maybeSwapResponse.isErr()) {
    const error = maybeSwapResponse.unwrapErr()
    const cause = error.cause as AxiosError<any, any>
    throw Error(cause.response!.data.detail)
  }

  const { data: swapResponse } = maybeSwapResponse.unwrap()

  const convertJupiterInstruction = (instruction: Instruction): TransactionInstruction => ({
    ...instruction,
    keys: instruction.accounts.map(account => ({
      ...account,
      pubkey: new PublicKey(account.pubkey),
    })),
    data: Buffer.from(instruction.data, 'base64'),
    programId: new PublicKey(instruction.programId),
  })

  const instructions: TransactionInstruction[] = [
    ...swapResponse.setupInstructions.map(convertJupiterInstruction),
    convertJupiterInstruction(swapResponse.swapInstruction),
  ]

  if (feeAccountInstruction && affiliateBps !== '0') {
    instructions.unshift(feeAccountInstruction)
  }

  if (createTokenAccountInstruction) {
    instructions.unshift(createTokenAccountInstruction)
  }

  if (swapResponse.cleanupInstruction) {
    instructions.push(convertJupiterInstruction(swapResponse.cleanupInstruction))
  }

  return { instructions, addressLookupTableAddresses: swapResponse.addressLookupTableAddresses }
}
