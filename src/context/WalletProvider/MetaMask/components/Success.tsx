import { SuccessModal } from 'context/WalletProvider/components/SuccessModal'

export const MetaMaskSuccess = () => {
  return (
    <SuccessModal
      headerText={'walletProvider.shapeShift.nativeSuccess.header'}
      bodyText={'walletProvider.shapeShift.nativeSuccess.success'}
    ></SuccessModal>
  )
}
