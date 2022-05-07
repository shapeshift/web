import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import { WithdrawInfo } from '@shapeshiftoss/investor-foxy'
import { Asset } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { FaArrowDown, FaArrowRight } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type WithdrawCardProps = {
  asset: Asset
  releaseTime?: string
} & WithdrawInfo

export const WithdrawCard = ({ asset, ...rest }: WithdrawCardProps) => {
  const history = useHistory()
  const { amount, releaseTime } = rest
  const hasClaim = bnOrZero(amount).gt(0)
  const textColor = useColorModeValue('black', 'white')
  const isAvailable = dayjs().isAfter(dayjs(releaseTime))
  const successColor = useColorModeValue('green.500', 'green.200')

  const handleClick = () => {
    history.push('/claim')
  }

  if (!hasClaim) {
    return <Text color='gray.500' translation='defi.modals.foxyOverview.emptyWithdraws' />
  }

  return (
    <Button
      variant='input'
      isFullWidth
      maxHeight='auto'
      height='auto'
      alignItems='center'
      justifyContent='flex-start'
      textAlign='left'
      isDisabled={!isAvailable}
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
          color={isAvailable ? successColor : 'yellow.200'}
          fontWeight='normal'
          lineHeight='shorter'
          translation={isAvailable ? 'common.available' : 'common.pending'}
        />
      </Stack>
      <Stack spacing={0} ml='auto' textAlign='right'>
        <Amount.Crypto
          color={textColor}
          value={bnOrZero(amount).div(`1e+${asset.precision}`).toString()}
          symbol={asset.symbol}
          maximumFractionDigits={4}
        />
        {isAvailable ? (
          <Stack direction='row' alignItems='center' color='blue.500'>
            <Text translation='defi.modals.claim.claimNow' />
            <FaArrowRight />
          </Stack>
        ) : (
          <Text
            fontWeight='normal'
            lineHeight='shorter'
            translation={[
              'defi.modals.foxyOverview.availableDate',
              { date: dayjs(releaseTime).fromNow() },
            ]}
          />
        )}
      </Stack>
    </Button>
  )
}
