import { Box, Card, CardBody, Flex, Link, Progress, Tag, Text } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { Proposal } from 'state/apis/snapshot/validators'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const hoverProps = {
  opacity: '0.6',
  transition: 'opacity 0.2s',
}

export const FoxGovernanceProposal: React.FC<Proposal> = ({
  title,
  body,
  choices,
  scores,
  scores_total,
  link,
}) => {
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))

  return (
    <Link href={link} isExternal={true} _hover={hoverProps}>
      <Card width='100%' my={2}>
        <CardBody py={4} px={4}>
          <Text fontSize='md' fontWeight='bold'>
            {title}
          </Text>
          <Text
            fontSize='md'
            color='text.subtle'
            whiteSpace='nowrap'
            textOverflow='ellipsis'
            overflow='hidden'
            mb={4}
          >
            {body}
          </Text>
          {choices.map((option, index) => {
            const percent = bnOrZero(scores?.[index])
              .div(scores_total ?? 1)
              .times(100)
              .toNumber()

            return (
              <Box key={option} justifyContent='space-between' alignItems='center' my={4}>
                <Flex alignItems='center' justifyContent='space-between' mb={2}>
                  <Text fontSize='md'>{option}</Text>
                  <Flex fontSize='md' ml={2} alignItems='center'>
                    <Amount.Crypto
                      value={bnOrZero(scores?.[index]).toFixed(0)}
                      symbol={foxAsset?.symbol ?? ''}
                      me={2}
                    />
                    <Tag colorScheme='blue'>
                      <Amount.Percent
                        value={bnOrZero(percent).div(100).toFixed(4)}
                      ></Amount.Percent>
                    </Tag>
                  </Flex>
                </Flex>
                <Progress borderRadius='30' colorScheme='green' size='sm' value={percent} />
              </Box>
            )
          })}
        </CardBody>
      </Card>
    </Link>
  )
}
