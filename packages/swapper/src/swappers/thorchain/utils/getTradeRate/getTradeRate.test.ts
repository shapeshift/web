import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import type Web3 from 'web3'

import { BTC, ETH, FOX, UNSUPPORTED } from '../../../utils/test-data/assets'
import type { ThorchainSwapperDeps } from '../../types'
import { thorService } from '../thorService'
import { getTradeRate } from './getTradeRate'
jest.mock('../thorService')

describe('getTradeRate', () => {
  const deps: ThorchainSwapperDeps = {
    midgardUrl: '',
    daemonUrl: '',
    adapterManager: {} as ChainAdapterManager,
    web3: {} as Web3,
  }

  it('should calculate a correct rate for trading ETH to FOX', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: {
          expected_amount_out: '1575048772',
          expiry: 1681129306,
          fees: {
            affiliate: '0',
            asset: 'ETH.ETH',
            outbound: '720000',
          },
          inbound_address: '0xInboundAddress',
          memo: '=:ETH.ETH:0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
          notes:
            'Base Asset: Send the inbound_address the asset with the memo encoded in hex in the data field. Tokens: First approve router to spend tokens from user: asset.approve(router, amount). Then call router.depositWithExpiry(inbound_address, asset, amount, memo, expiry). Asset is the token contract address. Amount should be in native asset decimals (eg 1e18 for most tokens). Do not send to or from contract addresses.',
          outbound_delay_blocks: 183,
          outbound_delay_seconds: 2196,
          router: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
          slippage_bps: 879,
          warning: 'Do not cache this response. Do not send funds after the expiry.',
        },
      }),
    )

    const receiveAddress = '0xFooBar'

    const rate = await getTradeRate({
      sellAsset: ETH,
      buyAssetId: FOX.assetId,
      sellAmountCryptoBaseUnit: '1000000000000000000000000',
      receiveAddress,
      deps,
    })
    const expectedRate = '0.00001727627203157549'
    expect(rate).toEqual(expectedRate)
  })

  it('should calculate a correct rate for trading FOX to ETH', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: {
          expected_amount_out: '1168571',
          expiry: 1681132574,
          fees: {
            affiliate: '0',
            asset: 'ETH.ETH',
            outbound: '720000',
          },
          inbound_address: '0x3a4ed81942f6267b409a553767f95af94b790902',
          notes:
            'Base Asset: Send the inbound_address the asset with the memo encoded in hex in the data field. Tokens: First approve router to spend tokens from user: asset.approve(router, amount). Then call router.depositWithExpiry(inbound_address, asset, amount, memo, expiry). Asset is the token contract address. Amount should be in native asset decimals (eg 1e18 for most tokens). Do not send to or from contract addresses.',
          outbound_delay_blocks: 0,
          outbound_delay_seconds: 0,
          router: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
          slippage_bps: 1,
          warning: 'Do not cache this response. Do not send funds after the expiry.',
        },
      }),
    )

    const receiveAddress = '0xFooBar'

    const rate = await getTradeRate({
      sellAsset: FOX,
      buyAssetId: ETH.assetId,
      sellAmountCryptoBaseUnit: '100000000000',
      receiveAddress,
      deps,
    })
    const expectedRate = '188875.98759875987598759876'
    expect(rate).toEqual(expectedRate)
  })

  it('should calculate a correct rate for trading FOX to BTC', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: {
          expected_amount_out: '75710',
          expiry: 1681132683,
          fees: {
            affiliate: '0',
            asset: 'BTC.BTC',
            outbound: '48000',
          },
          inbound_address: '0x3a4ed81942f6267b409a553767f95af94b790902',
          notes:
            'Base Asset: Send the inbound_address the asset with the memo encoded in hex in the data field. Tokens: First approve router to spend tokens from user: asset.approve(router, amount). Then call router.depositWithExpiry(inbound_address, asset, amount, memo, expiry). Asset is the token contract address. Amount should be in native asset decimals (eg 1e18 for most tokens). Do not send to or from contract addresses.',
          outbound_delay_blocks: 0,
          outbound_delay_seconds: 0,
          router: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
          slippage_bps: 1,
          warning: 'Do not cache this response. Do not send funds after the expiry.',
        },
      }),
    )

    const receiveAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'

    const rate = await getTradeRate({
      sellAsset: FOX,
      buyAssetId: BTC.assetId,
      sellAmountCryptoBaseUnit: '100000000000',
      receiveAddress,
      deps,
    })
    const expectedRate = '12372.23722372237223722372'
    expect(rate).toEqual(expectedRate)
  })

  it('should calculate a correct rate for trading BTC to FOX', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: {
          dust_threshold: '10000',
          expected_amount_out: '261454522054192',
          expiry: 1681132269,
          fees: {
            affiliate: '0',
            asset: 'ETH.FOX-0XC770EEFAD204B5180DF6A14EE197D99D808EE52D',
            outbound: '16554235812',
          },
          inbound_address: 'bc1qucjrczghvwl5d66klz6npv7tshkpwpzlw0zzj8',
          inbound_confirmation_blocks: 2,
          inbound_confirmation_seconds: 1200,
          notes:
            'First output should be to inbound_address, second output should be change back to self, third output should be OP_RETURN, limited to 80 bytes. Do not send below the dust threshold. Do not use exotic spend scripts, locks or address formats (P2WSH with Bech32 address format preferred).',
          outbound_delay_blocks: 575,
          outbound_delay_seconds: 6900,
          slippage_bps: 4357,
          warning: 'Do not cache this response. Do not send funds after the expiry.',
        },
      }),
    )

    const receiveAddress = '0xFooBar'

    const rate = await getTradeRate({
      sellAsset: BTC,
      buyAssetId: FOX.assetId,
      sellAmountCryptoBaseUnit: '1000000000',
      receiveAddress,
      deps,
    })
    const expectedRate = '463354.73381180932128300549'
    expect(rate).toEqual(expectedRate)
  })

  it('should throw if trying to calculate a rate for an unsupported asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { error: 'Unsupported asset' } }),
    )

    const receiveAddress = '0xFooBar'

    await expect(
      getTradeRate({
        sellAsset: UNSUPPORTED,
        buyAssetId: ETH.assetId,
        sellAmountCryptoBaseUnit: '1000000000000000000',
        receiveAddress,
        deps,
      }),
    ).rejects.toThrow(`[getTradeRate]: No sellPoolId for asset ${UNSUPPORTED.assetId}`)
  })
})
