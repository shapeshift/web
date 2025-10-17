# MtPelerin Currency Update Reference

**Source:** https://developers.mtpelerin.com/service-information/chains-and-currencies
**Date:** 2025-10-17
**Issue:** https://github.com/shapeshift/web/issues/10772

## Assets to ADD

### cbBTC (Coinbase Wrapped BTC)
- **Ethereum:** `eip155:1/erc20:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf`
- **Base:** `eip155:8453/erc20:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf`
- **MtPelerin Docs:** Listed on Ethereum and Base

### EURA (Angle Euro)
- **Arbitrum:** `eip155:42161/erc20:0xfa5ed56a203466cbbc2430a43c66b9d8723528e7`
- **Polygon:** `eip155:137/erc20:0xe0b52e49357fd4daf2c15e02058dce6bc0057db4` (this is agEUR token)
- **MtPelerin Docs:** Listed on Ethereum, Optimism (we don't have), Polygon
- **Note:** Polygon agEUR should be mapped under EURA symbol per MtPelerin docs

### EURC (Circle Euro)
- **Ethereum:** `eip155:1/erc20:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c` (RENAME from EUROC)
- **Base:** `eip155:8453/erc20:0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42`
- **MtPelerin Docs:** Listed on Ethereum, Base, Avalanche (we don't have this one)

### GHO (Aave Stablecoin)
- **Ethereum:** `eip155:1/erc20:0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f`
- **MtPelerin Docs:** Listed on Ethereum

### PAXG (Paxos Gold)
- **Ethereum:** `eip155:1/erc20:0x45804880de22913dafe09f4980848ece6ecbaf78`
- **MtPelerin Docs:** Listed on Ethereum

### XAUt (Tether Gold)
- **Ethereum:** `eip155:1/erc20:0x68749665ff8d2d112fa859aa293f07a622782f38`
- **MtPelerin Docs:** Listed on Ethereum

### ZCHF (Swiss Franc Stablecoin)
- **Ethereum:** `eip155:1/erc20:0xb58e61c3098d85632df34eecfb899a1ed80921cb`
- **Gnosis:** `eip155:100/erc20:0xd4dd9e2f021bb459d5a5f6c24c12fe09c5d45553`
- **MtPelerin Docs:** Listed on Ethereum, Gnosis

### BTC.b (Bitcoin Bridge Token)
- **Avalanche:** `eip155:43114/erc20:0x152b9d0fdc40c096757f570a51e494bd4b943e50`
- **MtPelerin Docs:** Listed on Avalanche

### POL (Polygon Native Token)
- **Action:** RENAME MATIC → POL (keep existing Polygon native asset ID)
- **MtPelerin Docs:** Listed as POL on Polygon (formerly MATIC)

---

## Assets to REMOVE (Triple-check against official docs)

### jEUR (Jarvis Synthetic EUR)
- **Current chains:** Ethereum, BSC, Gnosis, Polygon
- **MtPelerin Docs:** NOT LISTED ❌

### jCHF (Jarvis Synthetic CHF)
- **Current chains:** Ethereum, BSC, Gnosis, Polygon
- **MtPelerin Docs:** NOT LISTED ❌

### jGBP (Jarvis Synthetic GBP)
- **Current chains:** Ethereum, Polygon
- **MtPelerin Docs:** NOT LISTED ❌

### EURT (Tether EUR)
- **Current chains:** Ethereum
- **MtPelerin Docs:** NOT LISTED ❌

### agEUR (Angle Euro) - PARTIAL REMOVAL
- **Current chains:** Ethereum, Polygon
- **Action:**
  - Remove Ethereum version (NOT in MtPelerin docs)
  - Keep Polygon version but map under EURA symbol instead
- **MtPelerin Docs:** Polygon version listed as EURA

### UST (Terra USD - DEPRECATED)
- **Current chains:** Ethereum
- **MtPelerin Docs:** NOT LISTED ❌

### XCHF (CryptoFranc)
- **Current chains:** Ethereum
- **MtPelerin Docs:** NOT LISTED ❌
- **Note:** Different from ZCHF which IS supported

### BUSD (Binance USD - DEPRECATED)
- **Current chains:** BSC
- **MtPelerin Docs:** NOT LISTED ❌

### MAI (Qi Dao)
- **Current chains:** Polygon, Avalanche
- **MtPelerin Docs:** NOT LISTED ❌

### EUROe (Membrane Finance)
- **Current chains:** Ethereum, Polygon, Arbitrum, Avalanche
- **MtPelerin Docs:** NOT LISTED ❌

---

## Fiat Currencies
**Status:** ✅ NO CHANGES NEEDED

Current list matches MtPelerin docs exactly (19 currencies):
AED, AUD, CAD, CHF, CZK, DKK, EUR, GBP, HKD, HUF, JPY, MXN, NOK, NZD, PLN, SEK, SGD, USD, ZAR

---

## Chain Mappings
**Status:** ✅ NO CHANGES NEEDED

Missing chains from MtPelerin docs (not supported in ShapeShift):
- Rootstock
- Sonic
- Tezos
- zkSync Era
- Bitcoin Lightning
- Celo

---

## Implementation Notes

1. **File to update:** `packages/caip/src/adapters/mtpelerin/index.ts`
2. **Constant to modify:** `MtPelerinSymbolToAssetIds` (lines 28-123)
3. **Both old and new fiat ramps share this adapter** - single source of truth
4. **Dynamic fetching:** The app fetches from MtPelerin API, then maps symbols via this adapter
