import { Box, Flex, FlexProps } from '@chakra-ui/layout'
import { FormLabel } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type AmountToStakeProps = {
  asset: Asset
  isCryptoField: boolean
  onInputToggle: () => void
  values: {
    fiatAmount?: string | undefined
    cryptoAmount?: string | undefined
  }
}
export const AmountToStake = ({
  onInputToggle,
  isCryptoField,
  values,
  asset,
  ...styleProps
}: AmountToStakeProps & FlexProps) => (
  <Flex {...styleProps}>
    <FormLabel lineHeight={1} color='gray.500'>
      <Text translation='defi.amountToStake' />
    </FormLabel>
    <Box
      as='button'
      lineHeight={1}
      mt={0}
      color='gray.500'
      onClick={onInputToggle}
      textTransform='uppercase'
      _hover={{ color: 'gray.400', transition: '.2s color ease' }}
    >
      {isCryptoField ? (
        <Amount.Fiat value={values?.fiatAmount || ''} />
      ) : (
        <Amount.Crypto value={values?.cryptoAmount || ''} symbol={asset.symbol} />
      )}
    </Box>
  </Flex>
)
