import * as core from '@shapeshiftoss/hdwallet-core'
import * as phantom from '@shapeshiftoss/hdwallet-phantom'
import type {
  PhantomEvmProvider,
  PhantomSolanaProvider,
} from '@shapeshiftoss/hdwallet-phantom/src/types'

export function name(): string {
  return 'Phantom'
}

const ethereumProvider = {
  request: vi.fn(({ method, params }: any) => {
    switch (method) {
      case 'eth_accounts':
        return ['0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8']
      case 'personal_sign': {
        const [message] = params

        if (message === '48656c6c6f20576f726c64' || message === '0x48656c6c6f20576f726c64')
          return '0x29f7212ecc1c76cea81174af267b67506f754ea8c73f144afa900a0d85b24b21319621aeb062903e856352f38305710190869c3ce5a1425d65ef4fa558d0fc251b'

        throw new Error('unknown message')
      }
      case 'eth_sendTransaction': {
        const [{ to }] = params

        return `txHash-${to}`
      }
      default:
        throw new Error(`ethereum: Unkown method ${method}`)
    }
  }),
} as unknown as PhantomEvmProvider

const solanaProvider = {} as unknown as PhantomSolanaProvider

export function createInfo(): core.HDWalletInfo {
  return new phantom.PhantomHDWalletInfo(ethereumProvider)
}

export async function createWallet(): Promise<core.HDWallet> {
  const wallet = new phantom.PhantomHDWallet(ethereumProvider, solanaProvider)
  await wallet.initialize()
  return wallet
}

export function selfTest(get: () => core.HDWallet): void {
  let wallet: phantom.PhantomHDWallet

  beforeAll(async () => {
    const w = get() as phantom.PhantomHDWallet

    if (phantom.isPhantom(w) && core.supportsETH(w) && core.supportsSolana(w)) {
      wallet = w
    } else {
      throw new Error('Wallet is not Phantom')
    }
  })

  it('supports Ethereum mainnet', async () => {
    if (!wallet) return
    expect(await wallet.ethSupportsNetwork(1)).toEqual(true)
  })

  it('does not support Secure Transfer', async () => {
    if (!wallet) return
    expect(await wallet.ethSupportsSecureTransfer()).toEqual(false)
  })

  it('does not support Native ShapeShift', async () => {
    if (!wallet) return
    expect(wallet.ethSupportsNativeShapeShift()).toEqual(false)
  })

  it('does not supports bip44 accounts', async () => {
    if (!wallet) return
    expect(wallet.supportsBip44Accounts()).toEqual(false)
  })

  it('supports EIP1559', async () => {
    if (!wallet) return
    expect(await wallet.ethSupportsEIP1559()).toEqual(true)
  })

  describe('Ethereum', () => {
    it('uses correct bip44 paths', () => {
      if (!wallet) return
      ;[0, 1, 3, 27].forEach(account => {
        const paths = wallet.ethGetAccountPaths({
          coin: 'Ethereum',
          accountIdx: account,
        })
        expect(paths).toEqual([
          {
            addressNList: core.bip32ToAddressNList(`m/44'/60'/${account}'/0/0`),
            hardenedPath: core.bip32ToAddressNList(`m/44'/60'/${account}'`),
            relPath: [0, 0],
            description: 'Phantom',
          },
        ])
        paths.forEach(path => {
          expect(
            wallet.describePath({
              coin: 'Ethereum',
              path: path.addressNList,
            }).isKnown,
          ).toBeTruthy()
        })
      })
    })

    it('can describe paths', () => {
      if (!wallet) return
      expect(
        wallet.describePath({
          path: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
          coin: 'Ethereum',
        }),
      ).toEqual({
        verbose: 'Ethereum Account #0',
        coin: 'Ethereum',
        isKnown: true,
        accountIdx: 0,
        wholeAccount: true,
        isPrefork: false,
      })

      expect(
        wallet.describePath({
          path: core.bip32ToAddressNList("m/44'/60'/3'/0/0"),
          coin: 'Ethereum',
        }),
      ).toEqual({
        verbose: 'Ethereum Account #3',
        coin: 'Ethereum',
        isKnown: true,
        accountIdx: 3,
        wholeAccount: true,
        isPrefork: false,
      })

      expect(
        wallet.describePath({
          path: core.bip32ToAddressNList("m/44'/60'/0'/0/3"),
          coin: 'Ethereum',
        }),
      ).toEqual({
        verbose: "m/44'/60'/0'/0/3",
        coin: 'Ethereum',
        isKnown: false,
      })
    })
  })
}
