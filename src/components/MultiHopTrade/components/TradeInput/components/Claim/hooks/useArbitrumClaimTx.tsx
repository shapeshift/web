export const useArbitrumClaimTx = (
  _claimDetails: any,
  _destinationAccountId: string,
  _onError: () => void,
  _onMutate: () => void,
  _onSuccess: (txHash: string) => void,
) => {
  const evmFeesResult = {
    data: {
      networkFeeCryptoBaseUnit: '0',
      txFeeFiat: '0',
    },
    isSuccess: true,
    isFetching: false,
    isError: false,
    isPending: false,
  }

  const claimMutation = {
    mutateAsync: () => {
      throw new Error('ArbitrumBridge claim functionality not yet implemented')
    },
    isError: false,
    isPending: false,
  }

  return {
    evmFeesResult,
    claimMutation,
  }
}
