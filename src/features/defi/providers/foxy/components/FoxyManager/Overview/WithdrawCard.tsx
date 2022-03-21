import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import { WithdrawInfo } from '@shapeshiftoss/investor-foxy/dist/api/foxy-types'
import { Asset } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { FaArrowDown } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawCardProps = {
  asset: Asset
} & WithdrawInfo

export const WithdrawCard = ({ asset, ...rest }: WithdrawCardProps) => {
  const history = useHistory()
  const { amount } = rest
  const hasClaim = bnOrZero(amount).gt(0)
  const textColor = useColorModeValue('black', 'white')

  const handleClick = () => {
    history.push('/claim/confirm')
  }

  return hasClaim ? (
    <Text color='gray.500' translation='defi.modals.foxyOverview.emptyWithdraws' />
  ) : (
    <Button
      variant='input'
      isFullWidth
      maxHeight='auto'
      height='auto'
      alignItems='center'
      justifyContent='flex-start'
      textAlign='left'
      onClick={handleClick}
      py={4}
      leftIcon={
        <IconCircle>
          <FaArrowDown />
        </IconCircle>
      }
    >
      <Stack spacing={0}>
        <Text color={textColor} translation='common.withdrawal' />
        <Text
          color='yellow.200'
          fontWeight='normal'
          lineHeight='shorter'
          translation='common.pending'
        />
      </Stack>
      <Stack spacing={0} ml='auto' textAlign='right'>
        <Amount.Crypto color={textColor} value={amount} symbol={asset.symbol} />
        <Text
          fontWeight='normal'
          lineHeight='shorter'
          translation={[
            'defi.modals.foxyOverview.availableDate',
            { date: dayjs('2022-12-25').fromNow() }
          ]}
        />
      </Stack>
    </Button>
  )
}
