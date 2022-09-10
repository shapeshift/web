/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import type { ComponentMeta, ComponentStory } from '@storybook/react'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'

import { StepRow } from './components/StepRow'

export default {
  title: 'Layout/StepRow',
  component: StepRow,
  controls: { expanded: true },
} as ComponentMeta<typeof StepRow>

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

const Template: ComponentStory<typeof StepRow> = args => <StepRow {...args} />

export const Default = Template.bind({})
Default.args = {
  stepNumber: '1',
  label: 'Approval',
  children: <ExampleRows />,
  isActive: true,
}
export const Loading = Template.bind({})
Loading.args = {
  stepNumber: '1',
  label: 'Approval',
  children: <ExampleRows />,
  isLoading: true,
}
export const Complete = Template.bind({})
Complete.args = {
  stepNumber: '1',
  label: 'Approval',
  children: <ExampleRows />,
  isComplete: true,
}
