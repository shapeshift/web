import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'

type EquityRowBaseProps = {
  label: string
  fiatAmount?: string
  cryptoAmount?: string
  symbol: string
  color?: string
  allocation?: string
  subText?: string
} & ButtonProps

type ImageRequired =
  | { image: string; imageComponent?: JSX.Element }
  | { image?: string; imageComponent: JSX.Element }

type EquityRowProps = EquityRowBaseProps & ImageRequired

export const EquityRow: React.FC<EquityRowProps> = ({
  label,
  image,
  imageComponent,
  fiatAmount,
  cryptoAmount,
  allocation,
  color,
  symbol,
  subText,
  ...rest
}) => {
  const labelParts = [label]
  if (subText) labelParts.push(subText)
  return (
    <Button
      height='auto'
      py={4}
      variant='ghost'
      justifyContent='flex-start'
      alignItems='center'
      display='flex'
      gap={4}
      {...rest}
    >
      {image && <LazyLoadAvatar src={image} />}
      {imageComponent && imageComponent}
      <Flex flex={1} alignItems='flex-start' justifyContent='space-between' gap={4}>
        <Flex flexDir='column' flex={1} gap={1} textAlign='left'>
          <RawText
            color='chakra-body-text'
            fontSize={{ base: 'sm', md: 'md' }}
            display={{ base: 'none', md: 'inline-block' }}
          >
            {labelParts.join(' • ')}
          </RawText>
          <RawText
            color='chakra-body-text'
            fontSize={{ base: 'sm', md: 'md' }}
            display={{ base: 'inline-block', md: 'none' }}
          >
            {label}
          </RawText>
          <Flex alignItems='center' gap={1} flex={1}>
            <Flex flex={1} height='0.875rem' alignItems='center' gap={2}>
              {/* <Progress
                size='xs'
                flex={1}
                isAnimated
                borderRadius='lg'
                sx={{
                  '& > div': {
                    background: color,
                    marginTop: '1px',
                  },
                }}
                value={bnOrZero(allocation).toNumber()}
              /> */}
              <Box
                height='4px'
                minWidth='4px'
                width={`${bnOrZero(allocation).toString()}%`}
                bgColor={color}
                borderRadius='lg'
              />
              <Amount.Percent
                display={{ base: 'none', md: 'inline-block' }}
                value={bnOrZero(allocation).times(0.01).toString()}
                fontSize='xs'
              />
            </Flex>
          </Flex>
        </Flex>

        <Flex flex={1} flexDir='column' alignItems='flex-end' fontWeight='medium' gap={1}>
          <Amount.Fiat
            fontSize={{ base: 'sm', md: 'md' }}
            color='chakra-body-text'
            value={bnOrZero(fiatAmount).toString()}
          />
          <Amount.Crypto
            value={bnOrZero(cryptoAmount).toString()}
            symbol={symbol}
            fontSize={{ base: 'xs', md: 'sm' }}
            lineHeight={1}
          />
        </Flex>
      </Flex>
    </Button>
  )
}
