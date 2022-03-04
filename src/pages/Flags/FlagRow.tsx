import { Switch } from '@chakra-ui/react'
import { useState } from 'react'
import { Row } from 'components/Row/Row'

type FlagRowProps = {
  flag: string
}
export const FlagRow = ({ flag }: FlagRowProps) => {
  const [isOn, setIsOn] = useState(false)
  const handleClick = () => {
    setIsOn(!isOn)
  }
  return (
    <Row>
      <Row.Label>{flag}</Row.Label>
      <Row.Value>
        <Switch isChecked={isOn} onChange={handleClick} />
      </Row.Value>
    </Row>
  )
}
