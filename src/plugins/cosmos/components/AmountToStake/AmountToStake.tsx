import { Flex, FlexProps } from '@chakra-ui/layout'
import { FormLabel } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type AmountToStakeProps = {
  asset: Asset
  isStake?: boolean
  isCryptoField: boolean
  onInputToggle: () => void
  values: {
    fiatAmount?: string | undefined
    cryptoAmount?: string | undefined
  }
}
export const AmountToStake = ({
  isStake = true,
  onInputToggle,
  isCryptoField,
  values,
  asset,
  ...styleProps
}: AmountToStakeProps & FlexProps) => (
  <Flex justifyContent='space-between' alignItems='flex-start' {...styleProps}>
    <FormLabel lineHeight={1} color='gray.500'>
      <Text translation={isStake ? 'defi.amountToStake' : 'defi.amountToUnstake'} />
    </FormLabel>
    <Flex
      as='button'
      type='button'
      lineHeight={1}
      mt={0}
      color='gray.500'
      onClick={onInputToggle}
      textTransform='uppercase'
      _hover={{ color: 'gray.400', transition: '.2s color ease' }}
    >
      {isCryptoField ? (
        <Amount.Fiat prefix={'≈'} value={values?.fiatAmount ?? ''} />
      ) : (
        <Amount.Crypto prefix={'≈'} value={values?.cryptoAmount ?? ''} symbol={asset.symbol} />
      )}
    </Flex>
  </Flex>
)
