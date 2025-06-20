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
