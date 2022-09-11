import { Text as CText } from '@chakra-ui/react'
import type { TagProps } from '@chakra-ui/tag'
import { Tag } from '@chakra-ui/tag'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'

type AprTagProps = {
  percentage: string | number
  showAprSuffix?: boolean
}

export const AprTag: React.FC<AprTagProps & TagProps> = ({
  percentage,
  showAprSuffix,
  ...styleProps
}) => {
  const translate = useTranslate()

  return (
    <Tag colorScheme='green' {...styleProps}>
      <Amount.Percent options={{ minimumFractionDigits: 0 }} value={percentage} />
      {showAprSuffix && (
        <CText>
          &nbsp;
          {`${translate('defi.apr')}*`}
        </CText>
      )}
    </Tag>
  )
}
