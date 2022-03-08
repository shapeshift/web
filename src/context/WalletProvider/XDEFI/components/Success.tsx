import { SuccessModal } from 'context/WalletProvider/components/SuccessModal'

export const XDEFISuccess = () => {
  return (
    <SuccessModal
      headerText={'walletProvider.shapeShift.success.header'}
      bodyText={'walletProvider.shapeShift.success.success'}
    ></SuccessModal>
  )
}
