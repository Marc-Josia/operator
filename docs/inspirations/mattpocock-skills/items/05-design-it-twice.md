# Item 05 — « Design it twice » dans le full lane d'`op-plan`

- **Milestone** : M4 · **Dépendances** : item 03 (`done` d'abord — même fichier) · **ADR** : non
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §3
  (ligne codebase-design).

## Contexte

Le spec full-lane d'`op-plan` (`src/payload/skills/op-plan/SKILL.md`, étape 3) exige une
section **Rejected alternatives** : « each serious alternative and the concrete reason it
lost ». Mais rien ne garantit que ces alternatives ont *existé* avant d'être « rejetées » —
le risque est la rationalisation post-hoc : l'agent conçoit une solution, puis invente une
alternative faible pour remplir la section. Le pattern `DESIGN-IT-TWICE` de Matt (d'après
Ousterhout) force l'existence réelle des alternatives : produire plusieurs designs sous des
contraintes volontairement opposées *avant* de choisir.

## Source d'inspiration

- `skills/engineering/codebase-design/DESIGN-IT-TWICE.md` — le pattern : cadrer le problème,
  puis produire **3+ designs sous des contraintes radicalement différentes** (ex. interface
  minimale / flexibilité maximale / optimiser le cas commun / ports & adapters), présenter
  séquentiellement, comparer sur des critères nommés (depth, locality, placement des seams),
  finir sur une **recommandation opinionated**. Chez Matt c'est fait par sous-agents
  parallèles aux contextes isolés (chaque design ignore les autres — l'isolation évite la
  convergence prématurée).
- `skills/engineering/codebase-design/SKILL.md` — les critères de comparaison (Depth, Seam,
  Leverage, Locality, deletion test), utiles pour formuler la grille de comparaison même si
  nous n'importons pas tout son glossaire.

## Quoi construire

Dans `src/payload/skills/op-plan/SKILL.md`, section full lane de l'étape 3 :

1. Avant d'écrire « Architecture & decisions », quand la décision de design est significative
   (elle mérite un ADR — même seuil que la règle ADR existante) : produire **deux ou trois
   esquisses de design sous des contraintes délibérément différentes**, chacune en quelques
   lignes (composants, flux, contrat — pas du code).
2. Formulation **agent-agnostique** de l'isolation : « si ton hôte permet des sous-agents,
   produis chaque esquisse dans un contexte isolé ; sinon, écris-les séquentiellement en
   t'interdisant de faire converger la deuxième vers la première » — le payload doit marcher
   sur les 5 hôtes, dont ceux sans sous-agents.
3. Comparer sur des critères nommés (simplicité de l'interface, localité du changement,
   testabilité au seam, réversibilité) et recommander ; les esquisses perdantes remplissent
   **Rejected alternatives** avec leur vraie raison de perdre, et l'ADR de la décision cite
   la comparaison.
4. Calibrage anti-cérémonie : pour une décision full-lane sans réelle alternative
   (« no other credible approach » est déjà une entrée valide de la section), le pattern se
   saute — une phrase le dit explicitement. Le déclencheur est « un vrai trade-off existe »,
   pas « lane full ».

## Critères d'acceptation

1. L'étape 3 full-lane d'op-plan contient le pattern (contraintes opposées, comparaison à
   critères nommés, recommandation), sa formulation agent-agnostique, et son seuil de
   déclenchement/skip.
2. La section Rejected alternatives est explicitement alimentée par les esquisses perdantes.
3. L'ajout net reste ≤ ~25 lignes (élaguer ce qu'il rend redondant).
4. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- Le pattern vit **dans la fenêtre d'op-plan, avant l'approbation** : les esquisses sont de la
  prose de spec, jamais du code — l'interdiction d'implémenter avant le mandat (étape 5
  d'op-plan) reste absolue.
- Ne pas importer le glossaire complet de `codebase-design` (Module/Depth/Seam/…) dans
  op-plan : l'item 07 en prend la part utile côté tests ; ici, seuls les critères de
  comparaison sont nommés.
- Ne référencer aucun outil propre à un hôte (Task tool, `subagent_type`…) dans le payload.
