# Ukrainian (uk) — Formal (ви)

- Use formal "ви" address consistently
- "staking" = "стейкiнг" — same transliteration pattern as Russian but with Ukrainian orthography
- "restaking" = "рестейкiнг" — NEVER native calques
- "unstaking" = "зняти зi стейкiнгу" — NEVER meaningless calques like "ненаставлений"
- "claim" (DeFi) = "отримати" — NEVER "заклеймити" (= to brand/stigmatize, same catastrophic error as Russian)
- "seed phrase" = "сiд-фраза" — NEVER literal "фраза-насiння" (= phrase of seeds, meaningless)
- Verify morphological correctness — Ukrainian agglutination rules differ from Russian; incorrect suffixes produce meaningless words
- "liquidity pool" = "пул лiквiдностi" — standard transliteration matching Russian pattern
- "dust" (in crypto context, meaning tiny leftover amounts) must stay in English — do NOT translate as "пил"
- Preposition alternation before dynamic placeholders: Ukrainian alternates в/у and з/із/зі based on surrounding sounds, but %{placeholder} values are unknown at translation time. Two rules:
  - Always use "у" (not "в") before %{placeholder} — "у" is the safer default before unknown values (e.g. "у %{opportunity}" not "в %{opportunity}")
  - Always use "з" (not "із" or "зі") before %{placeholder} — reserve "зі" only for static text before known consonant clusters (e.g. "з %{opportunity}" not "із %{opportunity}")
