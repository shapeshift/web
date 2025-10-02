# Technical document, arbitrum claims/bridge notifications

### Wire up Arb Withdraws, Claims, Deposits in action center

See ticket below:

```
Overview [Author]

In order to not fetch the world and keep actions on the app native to the notifications, we should fire 1:1 toasts for bridges users complete here and capture the Arbitrum states that they fall into.The experience goes to the  action card and we remove the claim tab.

Withdraw/Claim

Because there can be several days from a withdraw to a claim, we will need to combine these two actions together.

Withdraw TX Link

Time until claim (relative time would be great, if possible)

Claim button (disabled until the claim becomes available)

Deposit:

This should similar to what we did with swap TXes, showing the usual status Pending, Status, or Complete stages. the difference is the action card now contains the updates. so anything pending for like 28 days is less obtrusive to the user and no circle that keeps rendering b/c we're polling tx-es.

User story

As a user of the Arb bridge back to mainnet, i have a 7 day claim window until i get my tokens. I need a notification to update when i can claim my assets on mainnet so that i remember to claim those tokens ( if we fire another toast that would be swell but not necessary).

AC/Rough how to fix [Eng]

Add an action center notification that covers the end to end Arb bridge flow.

Bridge initiated

Pending (with time remaining)

Failed

Claim available

Claimed

Eng notes from previous ticket/grooming

We probably want to keep timing of claims dumb and have the frontend just read whenever the bridge initiation starts (whenever that card is rendered it's just calculating Estimated TIme - Time elapsed)

Currently, claims fetch every Tx and it's super heavy.

once you claim, we know it's claimed so we only fetch claim once.

Withdraw Tx will have your Tx super quickly.

Deposit should render the tx to Arb, and then on balance update it just shows up.

chat thread here

Figma Links:

States

Toasts:

Toasts should fire when you initiate a tx, and then state changes should optimistically update. But if it's too much overhead to update a state within like 15 mins we should just let the status complete in the action center.

ARB Withdraw - Notification Center (Figma)

ARB Claim - Notification Center (Figma)

ARB Deposit 
```

See comments below:

```
Please add screens on what is being removed (the status screen(s)), and be explicit about what is being added - the toasts and action center rows.

Added screenshots from the experience on   so they are on the ticket not cross listed and buried. 

also, does this mean we can get rid of claims on the swapper?  

also, does this mean we can get rid of claims on the swapper?


Tl;dr yes. because now we can poll in notification center and stop spending on entire tx history search 

This has been sitting for a bit: 

add what's being removed side by side 

Double check edge cases, tie up the loose edges from  that capture the UX. basically we have actions now, so we can combine these two tickets. 

include the full flow/AC on one ticket so it's just clearer.
```

## Important notes, before you continue

- Do not author code yet. Plan mode first, always. 
- Get a full understanding of the current claim functionality, as well as *all* notification types, their subscribers, their shape, and the notificatio/action center shape, functoinality, and flow
- Ask me for missing screenshots from figma links, I'll send them to you 
- Take all product statements above with a grain of salt, and consider them incomplete. I'll give you more technical/product details below

## Technical notes / Scope / Product considerations

- IMPORTANT: From a technical perspective, all that really matters from a scope perspective is claims here. Or well, deposits here, but those are more straightforwards, so we will NOT add them to this scope.
- There is already an ersatz of Arbitrum Bridge notifications as swap notifications, we may want to extend that 
- As you can see, the current claim logic scans the whole Tx history when first rendering. Then searches for claim Txs, actionnable ones, renders them with their meta. Ideally, we'll do things very differently here: 
  - When a user initiates a withdraw Tx, we create an ArbitrumBridgeWithdraw notification for it. 
  - Then, we have a subcriber that instead of scanning the whole Tx history, only checks those specific withdraw Txs. Or none if none. That's a performant benefit in the sense that we don't have to scan the world, but it obviously means you won't see the ones initiated before in the app. That is fine. 
  - Then, inner logic of subcriber should work very similar to current claim functionality. 
  - In terms of statuses, we should be able to handle withdraw initiated, as well as claim ready, and handle that gracefully in the UI (ask me for screenshots of Figma)
  - As a way to validate things/shape here, before we even start with the subscriber, it may be a good idea to start with existing claims tab, where, if you go with it, those get upserted as arbitrum withdraws with claim ready in action center 
  - Obviously, we will want to also author components etc 
  - Try to get inspiration from all other action types for most, but ask questions if things shall get done diff here
