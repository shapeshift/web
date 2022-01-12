// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test EthereumChainAdapter
 * @group unit
 */
import * as ethereum from './EthereumChainAdapter'

const getGasFeesMockedResponse = {
  data: {
    gasPrice: '1',
    maxFeePerGas: '300',
    maxPriorityFeePerGas: '10'
  }
}

const estimateGasMockedResponse = { data: '21000' }

jest.mock('axios', () => ({
  get: jest.fn(() =>
    Promise.resolve({
      data: {
        result: [
          {
            source: 'MEDIAN',
            timestamp: 1639978534,
            instant: 55477500000,
            fast: 50180000000,
            standard: 45000000000,
            low: 41000000000
          }
        ]
      }
    })
  )
}))

describe('EthereumChainAdapter', () => {
  let args: ethereum.ChainAdapterArgs = {} as any

  beforeEach(() => {
    args = {
      providers: {
        http: {} as any,
        ws: {} as any
      }
    }
  })
  describe('getBalance', () => {
    it('is unimplemented', () => {
      expect(true).toBeTruthy()
    })
  })

  describe('getFeeData', () => {
    it('should return current ETH network fees', async () => {
      args.providers.http = {
        estimateGas: jest.fn().mockResolvedValue(estimateGasMockedResponse),
        getGasFees: jest.fn().mockResolvedValue(getGasFeesMockedResponse)
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const data = await adapter.getFeeData({
        to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
        value: '123',
        chainSpecific: {
          from: '0x0000000000000000000000000000000000000000',
          contractData: '0x'
        }
      })

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '50180000000',
              maxFeePerGas: '300',
              maxPriorityFeePerGas: '10'
            },
            txFee: '1053780000000000'
          },
          fast: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '55477500000',
              maxFeePerGas: '332',
              maxPriorityFeePerGas: '12'
            },
            txFee: '1165027500000000'
          },
          slow: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '41000000000',
              maxFeePerGas: '246',
              maxPriorityFeePerGas: '9'
            },
            txFee: '861000000000000'
          }
        })
      )
    })
  })
})
