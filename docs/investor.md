# Investor - Single-Sided Staking
The `investor` package is an abstraction to implement protocols that allow for staking or delegating a single asset.

[Idle Finance](https://idle.finance) is an example of this type of single-sided staking protocol.

You can look at [lib/investor/investor-foxy](https://github.com/shapeshift/web/tree/develop/src/lib/investor/investor-foxy) as an example implementation.

### 
The `investor` package is made up of three parts.

# `Investor<TxType = unknown, MetaData = unknown>`
The `Investor` interface provides functions to find available investment opportunities.

These generic types are used in the `InvestorOpportunity` interface and will be explained there.

## Functions

### `initialize() => Promise<void>`

Use this function to implement any logic that should be done before any of the `find` functions are called.

You may choose to pull in and cache the opportunities or verify that the backend you talk to is available.

You may `throw` an error to indicate an error.

### `findAll() => Promise<Array<InvestorOpportunity<TxType, MetaData>>>`

This function must return an array of `InvestorOpportunities` and should represent all the available opportunities. 

Return an empty array `[]` if there are no opportunities.

### `findByOpportunityId: (opportunityId: string) => Promise<InvestorOpportunity<TxType, MetaData> | undefined>`

`opportunityId` is a string matching whatever your `InvestorOpportunity` implementation returns as the `id` field.

This function must return either 1) an `InvestorOpportunity` or 2) `undefined` to indicate that the opportunity does not exist.

### `findByUnderlyingAssetId: (assetId: string) => Promise<Array<InvestorOpportunity<TxType, MetaData>>>`

`assetId` is a `AssetId` type as defined in `@shapeshiftoss/caip`. `AssetId` is a `string` formatted per the CAIP-19 specification.

This function must return an array of `InvestorOpportunities` in which the `InvestorOpportunity.underlyingAsset.assetId` matches the provided `assetId`.

Return an empty array `[]` if there are no matching opportunities.

# `InvestorOpportunity<TxType = unknown, MetaData = unknown>`

An `Opportunity` represents a destination for an `Asset`.

# Generic Types

`TxType` defines the type returned by the `prepare` functions and is also required as an argument to the `signAndBroadcast` function.

This type should contain enough information for the `signAndBroadcast` to be able to sign a valid transaction, including fees.

It is recommended that this type include 3 fee options keyed by `FeePriority` so that a user can select a priority and the `sign` function can use the correct fees. See the explanation of the `signAndBroadcast` function for more detail.

`MetaData` defines the type of the `metadata` property and can be whatever you want to store protocol specific information.

# Required Types

`BigNumber` - this type comes from `bignumber.js`. Please use version `^9.0.2`.

## Properties 

### `id: string`

Any `string` value that uniquely identifies this Opportunity.

This is the value that would be passed into `Investor.findByOpportunityId` to get this specific opportunity.

For example, in "Yearn" the contract address is used as the id: [0x23D3D0f1c697247d5e0a9efB37d8b0ED0C464f7f](https://yearn.finance/#/vault/0x23D3D0f1c697247d5e0a9efB37d8b0ED0C464f7f) 

### `displayName: string`

Any `string` to display as the name of the `Opportunity` to a user

### `underlyingAsset: { assetId: string }`

This is the `Asset` that can be deposited into the `Opportunity`.

#### `assetId: string`

`assetId` must be of type `AssetId` from `@shapeshiftoss/caip` and is a CAIP-19 representation of the asset or token that can be deposited into this `Opportunity`.

For example, `AssetId` for Ethereum is `eip155:1/slip44:60`

The `src/lib/asset-service` directory has a full list of `AssetIds` that we currently support. You can submit a PR to add new assets.

### `positionAsset: { assetId: string, balance: BigNumber, underlyingPerPosition: BigNumber }`

This is the `Asset` that represents your position in the `Opportunity`.

In some protocols, when a deposit is made, the user receives a different asset or token, which can later be exchanged to get a quantity of the `underlyingAsset`.

In some protocols, there is no separate `Asset` to represent the position. In this case, the `assetId` should be the same as the `underlyingAsset.assetId`.

#### Examples

For example, there may be a Vault protocol that accepts deposits of `FOX` ERC20 token and then user receives `spFOX` tokens. The user's balance of `spFOX` represents their position. When the user initiates a WITHDRAWAL with their `spFOX` balance, they receive `FOX`.

In this example, `FOX` is the `UnderlyingAsset` and `spFOX` is the `PositionAsset`.

#### `assetId: string`

`assetId` must be an `AssetId` in CAIP-19 format that is the asset that represents your position.

This is used by the UI to show an Asset name and icon when showing the user's position.

#### `balance: BigNumber`

`balance` represents the size of the user's position in terms of the `positionAsset.assetId`.

The value must be an integer value without asset precision applied.

For example, 1 ETH would be represented as `BigNumber('1e18')` and NOT `BigNumber(1)`

#### `underlyingPerPosition: BigNumber`

This is a RATIO between the value of the `UnderlyingAsset` and the `PositionAsset`.

When a user DEPOSITS the `UnderlyingAsset` they will receive the inverse ratio amount of `PositionAsset`.

When a user WITHDRAWS from their `PositionAsset` they will receive `BigNumber(PositionAsset.balance * PositionAsset.underlyingPerPosition)` of the `UnderlyingAsset`. 

##### Example

For example, if a user deposits 10 `FOX` tokens into a `Opportunity` and receives back 1 `sFOX`, the `underlyingPerPosition` value would be `BigNumber(10)`

When the user withdraws/sells their 1 `sFOX` they will get back 10 `FOX`.
 
### `feeAsset: { assetId: string }`

This is the `Asset` that is used to pay transaction fees when doing a DEPOSIT or WITHDRAWAL.

#### `assetId: string`

`assetId` must be an `AssetId` in CAIP-19 format that is the asset that is used to pay transaction fees.

### `apy: BigNumber`

This is the estimated annual return, minus fees, that the user will receive from their position.

The value MUST BE greater than or equal to 0. 

A value of `BigNumber(1)` indicates a 100% APY.

A value of `BigNumber(0.1)` indicates a 10% APY.

### `tvl: { assetId: string, balance: BigNumber }`

TVL is an acronym for "Total Volume Locked" and represents the total value of the `Opportunity`.

Value is represented in terms of an `AssetId`, NOT in FIAT/USD value.

#### `assetId: string`

This is the `AssetId` in CAIP-19 format that is the `Asset` used in `balance`.

Typically, this will be the same as either `underlyingAsset.assetId` or `positionAsset.assetId`

#### `balance: BigNumber`

This is the balance of the total value in the `Opportunity`.

For example, if there is an `Opportunity` that has `FOX` as an `UnderlyingAsset`,
and there are 10,000,000 FOX deposited into the contract, then balance would be `BigNumber(1e25)`, since `FOX` has a precision of 18.

### `metadata?: MetaData`

This property is a place to store protocol specific information that you want to be made available to custom UI components.

The default UI components for single-sided staking don't look at this data.

## Functions

### `prepareWithdrawal: (input: DepositWithdrawArgs) => Promise<TxType>`

This function should determine whether the requested withdrawal is possible.

This function should validate the user's address, position balance, and any other information needed to determine if it's okay to proceed to the SIGNING step.

#### `input: { address: string, amount: BigNumber }`

`address: string` - The user's wallet address that contains a `PositionAsset` balance.

`amount: BigNumber` - The amount of `PositionAsset` that the user wants to withdraw.

`amount` must be an integer value, without asset precision applied. For example, 1 FOX would be `BigNumber(1e18)`

#### Returns `TxType`

The return of this function is generic and up to the implementer. The restriction is that the output of this function MUST be used as the input to `signAndBroadcast`.

### `prepareDeposit: (input: DepositWithdrawArgs) => Promise<TxType>`

This function should determine whether the requested deposit is possible.

This function should validate the user's address, underlying asset balance, and any other information needed to determine if it's okay to proceed to the SIGNING step.

#### `input: { address: string, amount: BigNumber }`

`address: string` - The user's wallet address that contains a `UnderlyingAsset` balance.

`amount: BigNumber` - The amount of `UnderlyingAsset` that the user wants to deposit.

`amount` must be an integer value, without asset precision applied. For example, 1 FOX would be `BigNumber(1e18)`

#### Returns `TxType`

The return of this function is generic and up to the implementer. The restriction is that the output of this function MUST be used as the input to `signAndBroadcast`.

### `signAndBroadcast: (input: { wallet: HDWallet, tx: TxType, feePriority?: FeePriority }) => Promise<string>`

This function is responsible for using `wallet` to sign the prepared transaction and broadcast it.

It is recommended that you use a compatible `ChainAdapter` from `@shapeshiftoss/chain-adapters` to simplify the implementation.

#### `wallet: HDWallet`

Your function will be given an [HDWallet](https://github.com/shapeshift/hdwallet) (`@shapeshiftoss/hdwallet-core`) instance that can be used to sign the transaction.

#### `tx: TxType`

This is the prepared transaction your code returned from `prepareDeposit` or `prepareWithdrawal`.

#### `feePriority?: FeePriority`

`FeePriority` is an enum that includes the values `fast`, `average`, and `slow`.

The UI will give the user a chance to select one of the three priorities. 

This function should accept their selection and use the appropriate fees. 

# Extensions

The `InvestorOpportunity` abstractions provides a fairly simple interface for basic staking protocols.

However, many protocols implement additional features.

We support some common additional features through `Extension` interfaces.

If your protocol implements a feature that's also common among other protocols, you may submit an Issue or PR to add an `Extension`.

## `ApprovalRequired<T>`

This interface provides an abstraction for protocols that require an Approval step. This is expected for Ethereum-based protocols.

### `allowance: (address: string) => Promise<BigNumber>`

Return the amount that the user has approved

#### `address: string`
The wallet address the user is interacting with

#### Return `BigNumber`
The amount in terms of the `UnderlyingAsset` that the user has approved to be transacted on their behalf. 

The return value should be an integer value in terms of the `UnderlyingAsset` without any precision applied.

Return `BigNumber(0)` if there is no approval, or they have used up their previous approval
