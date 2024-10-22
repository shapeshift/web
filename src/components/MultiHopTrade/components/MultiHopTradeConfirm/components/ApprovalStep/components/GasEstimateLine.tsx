import { Text } from 'components/Text'

export const GasEstimateLine = ({
  approvalNetworkFeeCryptoFormatted,
  gasFeeLoadingTranslation,
  gasFeeTranslation,
}: {
  approvalNetworkFeeCryptoFormatted: string | undefined
  gasFeeLoadingTranslation: string
  gasFeeTranslation: string
}) => {
  return (
    <Text
      color='text.subtle'
      translation={
        !Boolean(approvalNetworkFeeCryptoFormatted)
          ? gasFeeLoadingTranslation
          : [
              gasFeeTranslation,
              {
                fee: approvalNetworkFeeCryptoFormatted,
              },
            ]
      }
      fontWeight='bold'
    />
  )
}
