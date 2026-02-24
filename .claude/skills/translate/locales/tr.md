# Turkish (tr) — Formal (siz)

- Use formal "siz" address consistently
- Verify correct vowel harmony in suffixes (e.g., "Parolayı" not "Parolay" — accusative requires buffer vowel)
- "claim" (DeFi) = "talep etmek" — NEVER "yuklemeler" (= uploads, completely wrong)
- Keep DeFi English loanwords where Turkish crypto community uses them: staking, restaking, swap
- When borrowing English terms, use apostrophe for Turkish suffixes (e.g., "Stake'i Kaldır")
- Vowel harmony with dynamic placeholders: Turkish suffixes change form based on the last vowel of the preceding word, but %{placeholder} values are unknown at translation time. Since crypto symbols span all vowel classes (ETH=front, AVAX=back-unrounded, FOX=back-rounded), any static suffix will be wrong for some symbols. Two rules:
  - Avoid attaching case suffixes directly to %{placeholder} — restructure using postpositions instead (e.g. "%{symbol} için" not "%{symbol}'ı", "%{symbol} üzerinde" not "%{symbol}'de")
  - When a suffix on a placeholder is unavoidable, use front-unrounded harmony (e/i/in/den) as the default — this matches the majority of common crypto symbols (ETH, BTC, USDC, USDT)
