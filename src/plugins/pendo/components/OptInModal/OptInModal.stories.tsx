/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import type { Story } from '@storybook/react'
import { OptInModalBody } from 'plugins/pendo/components/OptInModal/OptInModalBody'

export default {
  title: 'Plugins/Analytics/OptInModalBody',
  component: OptInModalBody,
}

export const AnalyticsModal: Story = () => <OptInModalBody onContinue={() => {}} />
