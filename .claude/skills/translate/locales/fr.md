# French (fr) — Formal (vous)

- Use formal "vous" address consistently
- Register violations beyond pronouns: verb endings ("tu peux" vs "vous pouvez"); imperatives ("connecte" is tu-form, use "connectez" for vous)
- WRONG: "Connecte ton portefeuille" (tu-imperative + tu-possessive)
- RIGHT: "Connectez votre portefeuille" (vous-imperative + vous-possessive)
- "claim" (DeFi) verb = "réclamer", noun = "réclamation" — NEVER "réclame" (= advertisement in French)
- "supported" (feature/chain) = "pris(e) en charge" — not "supportée" (anglicism)
- Use consistent "vous" register: prefer "Veuillez + infinitive" for instructions, no mixed imperatives
- Keep product names exactly as-is: FOXy, rFOX, FOX Token are distinct products — never substitute one for another
- Prefer concise phrasing — French typically runs 30-40% longer than English, so trim filler words
- "seed phrase" = "phrase de récupération" — never literal "phrase de graine" or "phrase de semences"
- "unstake" = "déstaker" — coined French DeFi verb, consistent throughout
- "liquidity pool" = "pool de liquidités" — never "piscine"
- French elision with dynamic placeholders: "de" requires elision before vowels ("d'ETH") but placeholders resolve at runtime to unknown values. Two rules:
  - When a numeric %{amount} precedes the symbol, "de" is safe — digits prevent elision (e.g. "dépôt de %{amount} %{symbol}" → "dépôt de 1,5 ETH" is correct French)
  - When an asset/symbol placeholder appears directly after the preposition with no number buffer, use "en" (denominated in) instead of "de" (e.g. "montant en %{symbol}" not "montant de %{symbol}", "déstake en %{symbol}" not "déstake de %{symbol}")
