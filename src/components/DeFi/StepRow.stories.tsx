/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Story } from '@storybook/react'
import { ReactNode } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'

import { StepRow, StepRowProps } from './components/StepRow'

export default {
  title: 'Layout/StepRow',
  component: StepRow,
  controls: { expanded: true },
}

const ExampleRows = () => {
  return (
    <>
      <RawText>Allow ShapeShift DAO to use your FOX.</RawText>
      <Row>
        <Row.Label>Allowance to Approve</Row.Label>
        <Row.Value>Exact</Row.Value>
      </Row>
      <Row>
        <Row.Label>Estimated Gas Fee</Row.Label>
        <Row.Value display='flex'>
          <Amount.Fiat value='20.00' mr={2} />
          <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
        </Row.Value>
      </Row>
    </>
  )
}
type ExampleRowProps = StepRowProps & { children: ReactNode }
const ExampleRow: Story<ExampleRowProps> = args => <StepRow {...args} />

export const Default = (props: ExampleRowProps) => <ExampleRow {...props} />
Default.args = {
  stepNumber: '1',
  label: 'Approval',
  buttonLabel: 'Continue',
  children: <ExampleRows />,
  isActive: true,
}
export const Loading = (props: ExampleRowProps) => <ExampleRow {...props} />
Loading.args = {
  stepNumber: '1',
  label: 'Approval',
  buttonLabel: 'Continue',
  children: <ExampleRows />,
  isLoading: true,
}
export const Complete = (props: ExampleRowProps) => <ExampleRow {...props} />
Complete.args = {
  stepNumber: '1',
  label: 'Approval',
  buttonLabel: 'Continue',
  children: <ExampleRows />,
  isComplete: true,
}
