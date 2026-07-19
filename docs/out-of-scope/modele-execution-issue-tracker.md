# Modèle d'exécution de Matt (specs/tickets sur issue tracker, sans gates)

Operator n'adopte pas le modèle d'exécution de `mattpocock/skills` : état sur un issue tracker,
discipline purement déclarative, aucune gate mécanique.

## Pourquoi c'est hors périmètre

Le pipeline gaté d'Operator (« vérifié, pas affirmé » — `op.mjs` mesure le diff git réel) est
précisément ce qui manque au modèle de Matt ; y renoncer serait régresser sur la thèse centrale
du toolkit. Chez lui, tout repose sur la qualité du prompt et la discipline de l'agent.

## Échappatoires

On pioche la finesse *procédurale* de ses skills (grilling, tranches verticales, feedback loops)
et sa théorie d'authoring — via la roadmap `docs/inspirations/mattpocock-skills/` — sans toucher
au modèle d'exécution.

## Demandes passées

- 2026-07-18 — analyse d'adoption `mattpocock/skills` (`docs/inspirations/mattpocock-skills/reference.md` §7).
