import React from 'react'

type ApproveProps = {
  onApprove(): void
  onCancel(): void
}

export const Approve = (_: ApproveProps) => {
  return <div>Approve</div>
}
