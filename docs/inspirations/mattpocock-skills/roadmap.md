# Roadmap — adoption des inspirations `mattpocock/skills`

Chaque item a un brief autonome dans `items/`. Un agent = un item = une session ; lire
`README.md` (contrat commun) et `reference.md` avant de commencer. Mettre à jour la colonne
Statut en livrant (`todo` → `in-progress` → `done`, avec la date).

## Principe d'ordonnancement

Les milestones sont ordonnés par valeur et par dépendances. **M2 (audit d'authoring) doit
précéder les items qui réécrivent des skills** (02, 07, 09) : l'audit fixe le style des
descriptions et du corps ; le faire après obligerait à repasser sur les mêmes fichiers.
À l'intérieur d'un milestone, les items sont indépendants et parallélisables — sauf mention
contraire.

## M1 — Mémoire et garde-fous mécaniques (quick wins, indépendants de tout)

| # | Item | Brief | ADR ? | Statut |
|---|---|---|---|---|
| 01 | Mémoire des refus (`out-of-scope`) | `items/01-memoire-des-refus.md` | oui | done (2026-07-18) |
| 08 | Test « le routeur ne ment jamais » | `items/08-test-routeur-ne-ment-jamais.md` | non | done (2026-07-18) |

## M2 — Qualité d'authoring (avant toute réécriture de skill)

| # | Item | Brief | ADR ? | Statut |
|---|---|---|---|---|
| 03 | Audit d'authoring des 13 skills + conventions | `items/03-audit-authoring-skills.md` | optionnel | todo |

## M3 — Procédures enrichies (après 03)

| # | Item | Brief | ADR ? | Statut |
|---|---|---|---|---|
| 02 | Boucle de feedback dans `op-fix`/`operator-debugging` | `items/02-op-fix-boucle-de-feedback.md` | non | todo |
| 07 | Seams et surface de test dans `operator-test-strategy` | `items/07-seams-test-strategy.md` | non | todo |
| 09 | Mode « frontière » optionnel dans `op-discover` | `items/09-discover-mode-frontiere.md` | non | todo |

## M4 — Couche projet et planification

| # | Item | Brief | ADR ? | Statut |
|---|---|---|---|---|
| 04 | Tranches verticales + dépendances dans `op-roadmap` | `items/04-roadmap-tranches-verticales.md` | oui | todo |
| 06 | Règle de durabilité des briefs longue durée | `items/06-durabilite-des-briefs.md` (dépend de 04) | non | todo |
| 05 | « Design it twice » dans le full lane d'`op-plan` | `items/05-design-it-twice.md` | non | todo |

## Questions ouvertes (pas encore des items)

- **Fog of war / wayfinder** : un mode « tickets-décision » pour les projets trop brumeux pour
  être découpés en milestones (`skills/engineering/wayfinder/SKILL.md` chez Matt). À étudier
  *après* l'item 04 — la refonte d'`op-roadmap` dira si un mode décisionnel séparé se
  justifie ou si une section « Not yet specified » dans `roadmap.md` suffit. Déboucherait sur
  un ADR.
- **Hygiène de contexte** (« smart zone », quand hand-off vs continuer) : guidance
  potentiellement utile dans la constitution, mais dépendante des harnais — à trancher quand
  les items M3 seront livrés.

## Coordination entre agents

- Deux items qui touchent le même `SKILL.md` ne se travaillent pas en parallèle
  (03 touche *tous* les skills → le finir avant de lancer M3).
- 04 et 06 touchent tous deux `op-roadmap` : 06 attend que 04 soit `done`.
- Chaque item livre sur une branche `item/NN-slug` depuis `develop` ; manifest régénéré et
  `npm test` vert avant toute PR.
