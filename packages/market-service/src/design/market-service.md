# `Market-Service`

Market Service acts as an abstraction layer over multiple cloud market providers. The main functionality
of this service is to find all market data, find market data for a single asset, find price history data
for all assets, and manage multiple cloud market data providers for asset market data. The design is meant to
be redundant and extensible so that assets not found on one provider can be found on another supported provider.
If one provider is unavailable, the manager should be able to fill in missing assets with the next redundant provder.

## Manager

The market service manager can take in asset data queries from the client and return the select proper
provider from which to call for the data.

It is also intended to gather data from all supported providers and merge the data together to produce a
combined list market data for all assets across providers.

All prices, marketCaps and volumes are represented in US Dollars.

* `findAll`
  * Args
    ```
      pages?: number,
      perPage?: number
    ```
  * returns an object keyed by caip19 with the following fields
    ```
      {
        [caip19: string]: {
          marketSource: enum
          price: string
          marketCap: string
          volume: string
          changePercent24Hr: number
        }
      }
    ```

  * example:
    ```
      {
        "bip122:000000000019d6689c085ae165831e93/slip44:0": {
          "marketSource": "coingecko",
          "price": "56378",
          "marketCap": "1064743990968",
          "volume": "40098748439",
          "changePercent24Hr": -2.20386
        },
        "eip155:1/slip44:60": {
          "marketSource": "coincap",
          "price": "4471.77",
          "marketCap": "531299807020",
          "volume": "23910936038",
          "changePercent24Hr": -4.10147
        },
        "eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7": {
          "marketSource": "coingecko",
          "price": "0.997413",
          "marketCap": "74905987311",
          "volume": "68207104573",
          "changePercent24Hr": 0.45793
        }
      }
    ```

* `findByCaip19`
  * Args
    ```
      caip19: string
    ```
  * returns an object keyed by caip19 with the following fields
    ```
      {
        marketSource: enum
        price: string
        marketCap: string
        volume: string
        changePercent24Hr: number
      }
    ```

  * example:
    ```
      {
        "marketSource": "coingecko",
        "price": "56378",
        "marketCap": "1064743990968",
        "volume": "40098748439",
        "changePercent24Hr": -2.20386
      }
    ```

* `findPriceHistoryByCaip19`
  * Args
    ```
      caip19: string
      timeframe: enum {
        HOUR = '1H',
        DAY = '24H',
        WEEK = '1W',
        MONTH = '1M',
        YEAR = '1Y',
        ALL = 'All'
      }
    ```
  * returns an array of HistoryData objects sorted descending by date (most recent at the top).
    ```
      [
        {
          price: number
          date: string
        }
      ]
    ```

  * example:
    ```
      [
        {
          price: 50000,
          date: '1631776000000'
        },
        {
          price: 49500,
          date: '1631664000000'
        },
        {
          price: 55500,
          date: '1631491200000'
        }
      ]
    ```
