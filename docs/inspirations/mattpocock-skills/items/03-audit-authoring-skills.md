# Item 03 — Audit d'authoring des 13 skills + conventions d'écriture

- **Milestone** : M2 · **Dépendances** : aucune — mais **bloque** les items 02, 07, 09
  (mêmes fichiers) · **ADR** : optionnel (si l'audit change une règle structurante)
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §4
  en entier — c'est la théorie que cet item applique.

## Contexte

Nos 13 skills (`src/payload/skills/*/SKILL.md`) ont été écrits avec soin mais sans théorie
d'élagage explicite. Symptôme mesurable : la `description:` d'`op-discover` fait ~250 mots,
celle d'`op-roadmap` autant — or chaque description de skill est potentiellement chargée à
chaque tour par les harnais qui font du model-invocation (**context load** permanent, multiplié
par 13 skills). Le méta-skill `writing-great-skills` de Matt fournit la grille d'audit la plus
rigoureuse disponible : cet item l'applique à tout notre payload et fixe les règles dans nos
conventions pour que les futurs skills naissent propres.

## Source d'inspiration

- `skills/productivity/writing-great-skills/SKILL.md` — lire en entier.
- `skills/productivity/writing-great-skills/GLOSSARY.md` — le modèle de domaine complet
  (Context Load, Cognitive Load, Leading Word, Completion Criterion, No-op, Sediment, Sprawl,
  Negation, Progressive Disclosure, Context Pointer, Single Source of Truth…).
- `.agents/invocation.md` chez Matt — l'axe user-invoked / model-invoked et sa mécanique.
- Pour voir la théorie appliquée : comparer son `grill-me` (corps = une ligne) et son
  `diagnosing-bugs` (steps + completion criteria nets).

## Quoi construire

1. **Passe descriptions** (les 13 `description:`) :
   - Une phrase-déclencheur **par branche** de comportement ; supprimer les synonymes qui
     re-déclenchent la même branche (duplication).
   - Couper de la description l'identité déjà dite dans le corps ; front-loader le leading
     word.
   - Cible indicative : réduire d'un tiers à moitié sans perdre un déclencheur réel. Tester
     mentalement chaque suppression : « un harnais qui ne voit *que* la description
     routerait-il encore juste ? »
2. **Passe corps** (les 13 corps + `agents-block.md` + `constitution.md`) :
   - **Completion criteria** : chaque étape numérotée finit sur un critère checkable (beaucoup
     l'ont déjà via les gates — vérifier les étapes non gatées).
   - **Test du no-op** phrase par phrase : supprimer toute phrase qui ne change pas le
     comportement par rapport au défaut du modèle. Supprimer la phrase entière, pas des mots.
   - **Négations** : reformuler en positif partout où c'est possible ; une interdiction ne
     reste que comme garde-fou dur, toujours accompagnée du geste à faire à la place. (Nos
     sections « Failure modes » sont légitimes — ce sont des garde-fous — mais chaque entrée
     doit finir sur l'action corrective, ce que la plupart font déjà.)
   - **Leading words** : identifier les concepts que nous paraphrasons (ex. « une commande
     capable de montrer le rouge » → *red-capable*) et les fixer comme tokens répétés.
   - **Sediment/duplication inter-fichiers** : ce qui est dit dans la constitution n'est pas
     re-dit dans un skill (single source of truth ; le bloc est déjà déclaré « résumé » de la
     constitution — vérifier que c'est vrai ligne à ligne).
3. **Fixer les règles** : ajouter une sous-section « Écrire un skill » dans les Conventions de
   contribution d'`AGENTS.md` (racine, en français) — les 6 règles ci-dessus en forme brève,
   avec renvoi vers ce dossier. Si le dépôt a un guide dans le skill de dev `skill-creator`,
   l'aligner.
4. **Rapport d'audit** : déposer `docs/inspirations/mattpocock-skills/items/03-rapport.md`
   listant, par skill : lignes/mots avant→après, no-ops supprimés, leading words introduits.
   C'est la preuve de l'item et la baseline du prochain audit.

## Critères d'acceptation

1. Les 13 descriptions sont passées à la grille ; aucune ne contient deux déclencheurs
   synonymes pour la même branche.
2. Le rapport d'audit existe avec les métriques avant/après.
3. `AGENTS.md` contient les règles d'écriture ; `agents-block.md` reste ≤ 60 lignes.
4. Le routage reste intact : relire le tableau de routage du bloc et la description de chaque
   skill côte à côte — chaque ligne du tableau a toujours son skill déclenchable.
5. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- **Ne pas confondre nos contraintes avec celles de Matt.** Chez lui, le routage repose surtout
  sur les descriptions ; chez nous, ADR-0013 place le routage dans le **bloc toujours chargé**
  (le harnais route, les descriptions sont un second filet pour les hôtes à model-invocation).
  Donc : élaguer la duplication, oui ; réduire une description au point qu'un hôte sans notre
  bloc ne route plus, non.
- L'axe user-invoked/model-invoked de Matt (frontmatter `disable-model-invocation`) est
  **Claude/Codex-spécifique** — ne pas l'introduire dans le payload agent-agnostique sans ADR
  dédié. Notre équivalent conceptuel existe déjà : le contrat `op-*` (procédures routées) vs
  `operator-*` (packs consultés).
- Un audit qui réécrit le *sens* d'une procédure a dérapé : le pipeline, les gates et les
  formats journalisés (`REPRO`, `APPROVAL`…) sont vérifiés par `op.mjs` et par les tests — ne
  toucher aucun format que `src/lib`/`op.mjs` parse sans faire tourner la suite.
