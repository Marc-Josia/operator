# Un skill « grilling » séparé

Operator n'ajoute pas de skill d'interview autonome façon `grilling`/`grill-me`.

## Pourquoi c'est hors périmètre

`op-discover` implémente déjà l'essentiel du mécanisme : une question à la fois, réponse
recommandée à chaque question, faits recherchés par l'agent vs décisions demandées à l'operateur
(ADR-0014). Un deuxième skill d'interview dupliquerait le comportement et brouillerait le routage.

## Échappatoires

Dire « grill me on this idea » route déjà vers `op-discover`. Les raffinements d'interview
(mode frontière par lots, etc.) s'ajoutent *dans* `op-discover` — voir l'item 09 de la roadmap.

## Demandes passées

- 2026-07-18 — analyse d'adoption `mattpocock/skills` (`reference.md` §7).
