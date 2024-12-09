export type Referral = {
  version: '0.1.0'
  name: 'referral'
  instructions: [
    {
      name: 'initializeProject'
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'base'
          isMut: false
          isSigner: true
        },
        {
          name: 'admin'
          isMut: false
          isSigner: false
        },
        {
          name: 'project'
          isMut: true
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'InitializeProjectParams'
          }
        },
      ]
    },
    {
      name: 'initializeReferralAccount'
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'partner'
          isMut: false
          isSigner: false
        },
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralAccount'
          isMut: true
          isSigner: true
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'InitializeReferralAccountParams'
          }
        },
      ]
    },
    {
      name: 'initializeReferralAccountWithName'
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'partner'
          isMut: false
          isSigner: false
        },
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'InitializeReferralAccountWithNameParams'
          }
        },
      ]
    },
    {
      name: 'updateProject'
      accounts: [
        {
          name: 'admin'
          isMut: false
          isSigner: true
        },
        {
          name: 'project'
          isMut: true
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'UpdateProjectParams'
          }
        },
      ]
    },
    {
      name: 'transferProject'
      accounts: [
        {
          name: 'admin'
          isMut: false
          isSigner: true
        },
        {
          name: 'newAdmin'
          isMut: false
          isSigner: false
        },
        {
          name: 'project'
          isMut: true
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'TransferProjectParams'
          }
        },
      ]
    },
    {
      name: 'updateReferralAccount'
      accounts: [
        {
          name: 'admin'
          isMut: false
          isSigner: true
        },
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralAccount'
          isMut: true
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'UpdateReferralAccountParams'
          }
        },
      ]
    },
    {
      name: 'transferReferralAccount'
      accounts: [
        {
          name: 'partner'
          isMut: false
          isSigner: true
        },
        {
          name: 'newPartner'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralAccount'
          isMut: true
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'TransferReferralAccountParams'
          }
        },
      ]
    },
    {
      name: 'initializeReferralTokenAccount'
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralAccount'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: []
    },
    {
      name: 'claim'
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'admin'
          isMut: false
          isSigner: false
        },
        {
          name: 'projectAdminTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'referralAccount'
          isMut: false
          isSigner: false
        },
        {
          name: 'referralTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'partner'
          isMut: false
          isSigner: false
        },
        {
          name: 'partnerTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
        },
        {
          name: 'associatedTokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: []
    },
    {
      name: 'createAdminTokenAccount'
      accounts: [
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'projectAuthority'
          isMut: true
          isSigner: false
        },
        {
          name: 'admin'
          isMut: false
          isSigner: false
        },
        {
          name: 'projectAdminTokenAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'associatedTokenProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: []
    },
    {
      name: 'withdrawFromProject'
      accounts: [
        {
          name: 'admin'
          isMut: true
          isSigner: true
        },
        {
          name: 'project'
          isMut: false
          isSigner: false
        },
        {
          name: 'projectAuthority'
          isMut: true
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'params'
          type: {
            defined: 'WithdrawFromProjectParams'
          }
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'project'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'base'
            type: 'publicKey'
          },
          {
            name: 'admin'
            type: 'publicKey'
          },
          {
            name: 'name'
            type: 'string'
          },
          {
            name: 'defaultShareBps'
            type: 'u16'
          },
        ]
      }
    },
    {
      name: 'referralAccount'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'partner'
            type: 'publicKey'
          },
          {
            name: 'project'
            type: 'publicKey'
          },
          {
            name: 'shareBps'
            type: 'u16'
          },
          {
            name: 'name'
            type: {
              option: 'string'
            }
          },
        ]
      }
    },
  ]
  types: [
    {
      name: 'InitializeProjectParams'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'name'
            type: 'string'
          },
          {
            name: 'defaultShareBps'
            type: 'u16'
          },
        ]
      }
    },
    {
      name: 'InitializeReferralAccountWithNameParams'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'name'
            type: 'string'
          },
        ]
      }
    },
    {
      name: 'InitializeReferralAccountParams'
      type: {
        kind: 'struct'
        fields: []
      }
    },
    {
      name: 'TransferProjectParams'
      type: {
        kind: 'struct'
        fields: []
      }
    },
    {
      name: 'TransferReferralAccountParams'
      type: {
        kind: 'struct'
        fields: []
      }
    },
    {
      name: 'UpdateProjectParams'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'name'
            type: {
              option: 'string'
            }
          },
          {
            name: 'defaultShareBps'
            type: {
              option: 'u16'
            }
          },
        ]
      }
    },
    {
      name: 'UpdateReferralAccountParams'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'shareBps'
            type: 'u16'
          },
        ]
      }
    },
    {
      name: 'WithdrawFromProjectParams'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'amount'
            type: 'u64'
          },
        ]
      }
    },
  ]
  events: [
    {
      name: 'InitializeProjectEvent'
      fields: [
        {
          name: 'project'
          type: 'publicKey'
          index: false
        },
        {
          name: 'admin'
          type: 'publicKey'
          index: false
        },
        {
          name: 'name'
          type: 'string'
          index: false
        },
        {
          name: 'defaultShareBps'
          type: 'u16'
          index: false
        },
      ]
    },
    {
      name: 'UpdateProjectEvent'
      fields: [
        {
          name: 'project'
          type: 'publicKey'
          index: false
        },
        {
          name: 'name'
          type: 'string'
          index: false
        },
        {
          name: 'defaultShareBps'
          type: 'u16'
          index: false
        },
      ]
    },
    {
      name: 'InitializeReferralAccountEvent'
      fields: [
        {
          name: 'project'
          type: 'publicKey'
          index: false
        },
        {
          name: 'partner'
          type: 'publicKey'
          index: false
        },
        {
          name: 'referralAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'shareBps'
          type: 'u16'
          index: false
        },
        {
          name: 'name'
          type: {
            option: 'string'
          }
          index: false
        },
      ]
    },
    {
      name: 'UpdateReferralAccountEvent'
      fields: [
        {
          name: 'referralAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'shareBps'
          type: 'u16'
          index: false
        },
      ]
    },
    {
      name: 'InitializeReferralTokenAccountEvent'
      fields: [
        {
          name: 'project'
          type: 'publicKey'
          index: false
        },
        {
          name: 'referralAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'referralTokenAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'mint'
          type: 'publicKey'
          index: false
        },
      ]
    },
    {
      name: 'ClaimEvent'
      fields: [
        {
          name: 'project'
          type: 'publicKey'
          index: false
        },
        {
          name: 'projectAdminTokenAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'referralAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'referralTokenAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'partnerTokenAccount'
          type: 'publicKey'
          index: false
        },
        {
          name: 'mint'
          type: 'publicKey'
          index: false
        },
        {
          name: 'referralAmount'
          type: 'u64'
          index: false
        },
        {
          name: 'projectAmount'
          type: 'u64'
          index: false
        },
      ]
    },
  ]
  errors: [
    {
      code: 6000
      name: 'InvalidCalculation'
    },
    {
      code: 6001
      name: 'InvalidSharePercentage'
    },
    {
      code: 6002
      name: 'NameTooLong'
    },
  ]
}

export const referralIdl: Referral = {
  version: '0.1.0',
  name: 'referral',
  instructions: [
    {
      name: 'initializeProject',
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'base',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'admin',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'project',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'InitializeProjectParams',
          },
        },
      ],
    },
    {
      name: 'initializeReferralAccount',
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'partner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralAccount',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'InitializeReferralAccountParams',
          },
        },
      ],
    },
    {
      name: 'initializeReferralAccountWithName',
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'partner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'InitializeReferralAccountWithNameParams',
          },
        },
      ],
    },
    {
      name: 'updateProject',
      accounts: [
        {
          name: 'admin',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'project',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'UpdateProjectParams',
          },
        },
      ],
    },
    {
      name: 'transferProject',
      accounts: [
        {
          name: 'admin',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'newAdmin',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'project',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'TransferProjectParams',
          },
        },
      ],
    },
    {
      name: 'updateReferralAccount',
      accounts: [
        {
          name: 'admin',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralAccount',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'UpdateReferralAccountParams',
          },
        },
      ],
    },
    {
      name: 'transferReferralAccount',
      accounts: [
        {
          name: 'partner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'newPartner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralAccount',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'TransferReferralAccountParams',
          },
        },
      ],
    },
    {
      name: 'initializeReferralTokenAccount',
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralAccount',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'claim',
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'admin',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'projectAdminTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'referralAccount',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'referralTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'partner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'partnerTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'createAdminTokenAccount',
      accounts: [
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'projectAuthority',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'admin',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'projectAdminTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'withdrawFromProject',
      accounts: [
        {
          name: 'admin',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'project',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'projectAuthority',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'params',
          type: {
            defined: 'WithdrawFromProjectParams',
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'project',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'base',
            type: 'publicKey',
          },
          {
            name: 'admin',
            type: 'publicKey',
          },
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'defaultShareBps',
            type: 'u16',
          },
        ],
      },
    },
    {
      name: 'referralAccount',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'partner',
            type: 'publicKey',
          },
          {
            name: 'project',
            type: 'publicKey',
          },
          {
            name: 'shareBps',
            type: 'u16',
          },
          {
            name: 'name',
            type: {
              option: 'string',
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'InitializeProjectParams',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'defaultShareBps',
            type: 'u16',
          },
        ],
      },
    },
    {
      name: 'InitializeReferralAccountWithNameParams',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
        ],
      },
    },
    {
      name: 'InitializeReferralAccountParams',
      type: {
        kind: 'struct',
        fields: [],
      },
    },
    {
      name: 'TransferProjectParams',
      type: {
        kind: 'struct',
        fields: [],
      },
    },
    {
      name: 'TransferReferralAccountParams',
      type: {
        kind: 'struct',
        fields: [],
      },
    },
    {
      name: 'UpdateProjectParams',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'name',
            type: {
              option: 'string',
            },
          },
          {
            name: 'defaultShareBps',
            type: {
              option: 'u16',
            },
          },
        ],
      },
    },
    {
      name: 'UpdateReferralAccountParams',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'shareBps',
            type: 'u16',
          },
        ],
      },
    },
    {
      name: 'WithdrawFromProjectParams',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'amount',
            type: 'u64',
          },
        ],
      },
    },
  ],
  events: [
    {
      name: 'InitializeProjectEvent',
      fields: [
        {
          name: 'project',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'admin',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'name',
          type: 'string',
          index: false,
        },
        {
          name: 'defaultShareBps',
          type: 'u16',
          index: false,
        },
      ],
    },
    {
      name: 'UpdateProjectEvent',
      fields: [
        {
          name: 'project',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'name',
          type: 'string',
          index: false,
        },
        {
          name: 'defaultShareBps',
          type: 'u16',
          index: false,
        },
      ],
    },
    {
      name: 'InitializeReferralAccountEvent',
      fields: [
        {
          name: 'project',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'partner',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'referralAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'shareBps',
          type: 'u16',
          index: false,
        },
        {
          name: 'name',
          type: {
            option: 'string',
          },
          index: false,
        },
      ],
    },
    {
      name: 'UpdateReferralAccountEvent',
      fields: [
        {
          name: 'referralAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'shareBps',
          type: 'u16',
          index: false,
        },
      ],
    },
    {
      name: 'InitializeReferralTokenAccountEvent',
      fields: [
        {
          name: 'project',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'referralAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'referralTokenAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'mint',
          type: 'publicKey',
          index: false,
        },
      ],
    },
    {
      name: 'ClaimEvent',
      fields: [
        {
          name: 'project',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'projectAdminTokenAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'referralAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'referralTokenAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'partnerTokenAccount',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'mint',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'referralAmount',
          type: 'u64',
          index: false,
        },
        {
          name: 'projectAmount',
          type: 'u64',
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidCalculation',
    },
    {
      code: 6001,
      name: 'InvalidSharePercentage',
    },
    {
      code: 6002,
      name: 'NameTooLong',
    },
  ],
}
