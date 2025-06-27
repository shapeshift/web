# ButterSwap Product Requirements

## 1. Overview

This document outlines the requirements for integrating the ButterSwap API as a new swapper within the ShapeShift application. ButterSwap provides a smart router service for finding and executing cross-chain swaps.

The integration will follow the established swapper architecture defined in `@swapper.mdc`. The goal is to create a new `ButterSwap` module that conforms to the `Swapper` and `SwapperApi` interfaces, allowing users to receive quotes and execute trades via the Butter Network.

## 2. API Endpoints

The integration will require implementing the following endpoints from the ButterSwap API, hosted at `https://bs-router-v3.chainservice.io`:

* **`GET /supportedChainList`**: Query the list of all supported chains by this service.
* **`GET /findToken`**: Find token information by a given address.
* **`GET /route`**: Query the best routes from token1 on Chain A to token2 on Chain B.
* **`GET /swap`**: Assemble transaction data based on the selected route.
* **`GET /routeAndSwap`**: A combination of querying the best routes and assembling transaction data.

*Source: [Butter Swap Integration Guide](https://docs.butternetwork.io/butter-swap-integration/integration-guide)*

## 3. Implementation Details

To ensure type safety and data integrity, we will use the existing `myzod` library to create schema validators for the JSON responses from each of the ButterSwap API endpoints.

These validators will be used to parse the incoming data and confirm that it matches the structure and types outlined in the ButterSwap API documentation before it is used within the application.

## 4. API Service

To handle all communication with the ButterSwap API endpoints, we will create a dedicated service file at `packages/swapper/src/swappers/ButterSwap/utils/butterSwapService.ts`.

This service will be constructed using the existing `makeSwapperAxiosServiceMonadic` helper function. This ensures that all API calls are wrapped in a monadic interface (`ResultAsync`), providing robust and consistent error handling across the application.

The service will also leverage the `createCache` utility to cache responses from the ButterSwap API where appropriate, improving performance and reducing redundant network requests. This approach follows the established pattern seen in other swappers like `ChainflipSwapper` and `CowSwapper`.

## 5. Development Methodology

To ensure accuracy and efficiency, we will follow a Test-Driven Development (TDD) approach that leverages real API responses to build our validators. The process for implementing each new endpoint will be as follows:

1. **Test with `curl`**: Use `curl` on the command line to interact with the live API endpoint. This allows for rapid testing of different parameters to find a valid request that returns a successful response.
2. **Write a Failing Test**: Once a valid `curl` command is established, create a new integration test for the target endpoint in the test suite. This test will initially fail because the validator is not yet correctly defined.
3. **Log the Raw Response**: Temporarily add a `console.log` statement to the endpoint's implementation within the `catch` block of the response promise. This will capture and display the raw JSON response from the ButterSwap API when the validation fails.
4. **Run the Test**: Execute the failing test. The raw response will be printed to the console.
5. **Create the Validator**: Using the logged response as a reference, create or update the `myzod` validator to accurately match the structure and data types of the API response.
6. **Implement the Endpoint**: Write the full implementation for the endpoint, using the newly created validator to parse the response.
7. **Remove Logging**: Once the validator is corrected, remove the temporary `console.log` statement from the endpoint implementation.
8. **Verify Tests Pass**: Rerun the tests to confirm that they now pass with the correct validator.
9. **Clean Up**: Remove any temporary logging from the test file itself.

This iterative process ensures that our validators are always in sync with the actual data returned by the live API, minimizing runtime errors and increasing the reliability of the integration.

## 6. Chain ID Mapping

To ensure interoperability between ShapeShift's internal `ChainId` format and the numeric chain IDs used by ButterSwap, a dedicated mapping utility has been created at `packages/swapper/src/swappers/ButterSwap/utils/helpers.ts`.

This file provides two key functions:

* `chainIdToButterSwapChainId(chainId: ChainId): number | undefined`: Converts a ShapeShift `ChainId` to a ButterSwap numeric ID.
* `butterSwapChainIdToChainId(butterSwapChainId: number): ChainId | undefined`: Converts a ButterSwap numeric ID to a ShapeShift `ChainId`.

This utility centralizes the mapping logic, making it easy to maintain and use throughout the ButterSwap swapper implementation.

## 7. To-Do List

### Get Trade Rate

* [x] Handle slippage
* [x] Populate fee data
  * [x] `networkFeeCryptoBaseUnit`
* [x] Implement `allowanceContract`
* [x] Double-check input `amount` calculation (re: shifting)

### Get Trade Quote

* [x] Handle affiliate BPS (basis points)
* [x] Populate `steps` section correctly
  * [x] `buyAmountBeforeFeesCryptoBaseUnit`
  * [x] `buyAmountAfterFeesCryptoBaseUnit`
* [x] Check `sellAmountIncludingProtocolFeesCryptoBaseUnit`
* [x] Populate `feeData` object
  * [x] `networkFeeCryptoBaseUnit`
  * [x] `protocolFees`
* [x] Check `rate` is correct
* [x] Update `allowanceContract`
* [x] Update `estimatedExecutionTimeMs`

### Common

* [x] Extract minimum slippage

### CheckTradeStatus

* [ ] Implement `CheckTradeStatus` function
  * Use the ButterSwap API endpoint `GET /api/queryBridgeInfoBySourceHash` with the source chain transaction hash to determine trade status.
  * Map the API's `state` field to internal status:
    * `0`: pending/in progress
    * `1`: complete/success
    * `6`: refunded/failed
  * Use `toHash` from the response as the destination chain transaction hash.
  * See [ButterSwap API: GET Swap History by Source Hash](https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash) for details.

## 8. Rate and Fee Calculation (Implementation Note)

For the purposes of rate calculation and fee display, the ButterSwap swapper only requires the following fields from the ButterSwap API response:

* `gasFee.amount` (in native token): Used to display the network fee to the user.
* `srcChain.totalAmountIn` and `dstChain.totalAmountOut` (or `srcChain.totalAmountOut` for same-chain): Used to calculate the effective swap rate as `rate = totalAmountOut / totalAmountIn`.

All other fields in the API response are not required for the core swapper logic.

**TODO:** Simplify fee handling in the implementation by only setting `networkFeeCryptoBaseUnit` and setting `protocolFees` as `undefined` in the swapper's feeData.

## 9. Single-Hop vs Multi-Hop (Signature Note)

In the context of ButterSwap, the distinction between single-hop and multi-hop swaps is not about the number of route hops in the API response, but about the number of transaction signatures required from the user.

* Even for multi-hop routes (e.g., cross-chain swaps), the ButterSwap protocol can often execute the entire swap with a single transaction and a single signature from the user.
* A test swap using the official ButterSwap UI confirmed that only a single signature was required, regardless of the number of hops in the route.

**Note:** A single hop (i.e., a single transaction/signature) may internally consist of multiple steps (route segments or asset swaps), but these are abstracted away from the user and handled within the ButterSwap protocol.

These STEPS are presented to the user as part of a single HOP in the UI, maintaining a simple, single-signature user experience.

## 10. Developer Workflow Notes

* Always use `yarn vitest run <path-to-test-file> -t "<test name>"` to run ButterSwap integration tests in run mode for the specific file and test you are working on.

  Example:
  yarn vitest run packages/swapper/src/swappers/ButterSwap/xhr.test.ts -t "ButterSwap ETH->USDC mainnet integration"

## Fee Handling PR Review TODOs

### 1. swapFee.nativeFee vs swapFee.tokenFee

* Reminder: `nativeFee` is the gas fee for the transaction (paid in the native asset, e.g., ETH for Ethereum).

* Reminder: `tokenFee` is a fee in the token being exchanged (likely the buy asset, similar to how CowSwap charges protocol fees in the buy asset).
* Both fees should not be nonzero at the same time. Example from the API:

```json
"swapFee": {
  "nativeFee": "0.0",
  "tokenFee": "0.00001"
}
```

* TODO: Make sure the code does not sum both fees and that logic assumes only one is nonzero at a time.

### 2. Protocol Fees Handling

* Protocol fees should be paid in addition to the swap, not deducted from the output amount.

* TODO: Make sure protocol fees are handled as an additional requirement for the user's balance, not as a downside to the swap amount.

### 3. Affiliate and Fee Rate

* The affiliate string format is `<nickname>[:rate]` (e.g., `butter:50` for a 0.5% affiliate fee).

* If the fee rate is not provided, the default base rate is used.
* TODO: Make sure the affiliate and fee rate are passed to ButterSwap as required, and that the logic is ready for affiliate integration.

### 4. General Fee Logic

* There was a suggestion to remove a code branch that sums both native and token fees, since both should never be nonzero.

* TODO: Make sure the code does not attempt to sum both fees and that the logic is simplified accordingly.

---
