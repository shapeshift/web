import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params } from '@shapeshiftoss/types'
import type { BigNumber } from 'bignumber.js'
import type { FeePriority } from 'lib/investor/types/Extensions'

export type DepositWithdrawArgs = {
  /** User's wallet address */
  address: string
  /** Amount of asset as an Integer without precision applied */
  amount: BigNumber
}

export interface InvestorOpportunity<TxType = unknown, MetaData = unknown> {
  /**
   * Opportunity id e.g., contract address or validator address
   */
  readonly id: string
  readonly displayName: string
  readonly underlyingAsset: {
    /**
     * Asset to be deposited
     *
     * User needs an available balance of this asset to be able to deposit
     */
    assetId: string
  }
  readonly positionAsset: {
    /**
     * Asset that represents their position
     */
    assetId: string
    /**
     * The amount of the position asset belonging to the user
     *
     * This represents the value of their staked/delegated position
     *
     * Amount is an integer value without precision applied
     */
    balance: BigNumber // This is probably a wallet concern not a opportunity concern
    /**
     * The ratio of value between the underlying asset and the position asset
     * in terms of underlying asset per position asset.
     *
     * Multiply the position asset amount by this value to calculate the amount of
     * underlying asset that will be received for a withdrawal
     */
    underlyingPerPosition: BigNumber
  }
  readonly feeAsset: {
    /**
     * Asset used to pay transaction fees
     */
    assetId: string
  }
  /**
   * The estimated return on deposited assets
   *
   * @example An APY of "1.0" means 100%
   */
  readonly apy: BigNumber
  readonly tvl: {
    /**
     * Asset that represents the total volume locked in the opportunity
     *
     * Should be the same as either the underlying or position assetId
     */
    assetId: string
    /**
     * The total amount of the TVL asset that is locked in the opportuntity
     *
     * Amount is an integer value without precision applied
     */
    balance: BigNumber
  }

  /**
   * Protocol specific information
   */
  readonly metadata?: MetaData

  /**
   * Prepare an unsigned withdrawal transaction
   *
   * @param input.address - The user's wallet address where the funds are
   * @param input.amount - The amount (as an integer value) of the position asset
   */
  prepareWithdrawal: (input: DepositWithdrawArgs) => Promise<TxType>

  /**
   * Prepare an unsigned deposit transaction
   *
   * @param input.address - The user's wallet address where the funds are
   * @param input.amount - The amount (as an integer value) of the underlying asset
   */
  prepareDeposit: (input: DepositWithdrawArgs) => Promise<TxType>

  /**
   * Sign and broadcast a previously prepared transaction
   */
  signAndBroadcast: (input: {
    wallet: HDWallet
    /** Prepared unsigned transaction (from prepareWithdrawal/Deposit) */
    tx: TxType
    /** Specify the user's preferred fee priority (fast/average/slow) */
    feePriority?: FeePriority
    bip44Params: Bip44Params
  }) => Promise<string>
}
