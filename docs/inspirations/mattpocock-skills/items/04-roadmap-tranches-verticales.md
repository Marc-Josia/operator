# Item 04 — Tranches verticales et dépendances dans `op-roadmap`

- **Milestone** : M4 · **Dépendances** : item 03 (`done` d'abord) ; **bloque** l'item 06
  (même fichier) · **ADR** : oui (étend ADR-0015, la couche projet)
- **Avant de commencer** : lire `../README.md` (contrat commun), `../reference.md` §3
  (lignes to-tickets et wayfinder), `docs/adr/0015-project-layer-above-work-items.md`.

## Contexte

`op-roadmap` (`src/payload/skills/op-roadmap/SKILL.md`) impose déjà : milestones = tranches
verticales démontrables, ordre par dépendance et valeur, « plan near, sketch far », done-when
observable, une section Sequencing. Ce qui manque, et que le `to-tickets` de Matt fait mieux,
c'est la discipline **au grain du work item** : aujourd'hui l'étape 3 dit « keep them vertical
and independently shippable where possible » et s'arrête là. Résultat possible : des items
horizontaux (« les modèles », « les endpoints ») ou trop gros pour une session, et des
dépendances notées en prose non exploitable.

## Source d'inspiration

- `skills/engineering/to-tickets/SKILL.md` — lire en entier. À prendre :
  1. **Règles de tranche verticale par ticket** : chaque item traverse toutes les couches en
     chemin *complet mais étroit* ; **démontrable seul** ; **dimensionné pour une seule
     fenêtre de contexte fraîche** (un agent, une session, sans compactage).
  2. **Arêtes de blocage déclarées par item** (`blocked-by`) et la notion de **frontière** :
     à tout moment, les items travaillables sont ceux dont tous les bloqueurs sont `done`.
  3. **Exception wide-refactor — expand–contract** : quand le vertical slicing ne s'applique
     pas (renommage transversal, migration de schéma, remplacement d'API interne), séquencer
     en *expand* (construire le nouveau à côté de l'ancien) → *migrate* (par lots dimensionnés
     par blast radius) → *contract* (supprimer l'ancien) ; chaque lot reste vert seul.
  4. **Prefactoring** : chercher d'abord le petit item qui *rend le changement facile*
     (« make the change easy, then make the easy change »).
  5. **Quiz de validation** : présenter le découpage en liste numérotée (titre, bloqué-par,
     ce que l'item livre) et itérer avec l'humain avant de figer — chez nous, ça se fond dans
     l'approbation operateur de l'étape 4, déjà obligatoire.
- `skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md` — le format local
  minimal des arêtes (`Blocked by: NN, NN`) : c'est le bon niveau de simplicité pour notre
  `roadmap.md`.

## Quoi construire

1. **ADR** : la discipline de décomposition (règles de tranche, arêtes, frontière,
   expand–contract) comme extension d'ADR-0015. Y trancher : les arêtes vivent dans
   `roadmap.md` (liste `blocked-by:` par item) et *pas* dans le frontmatter des workitems —
   la roadmap séquence, le workitem exécute (à confirmer/infirmer dans l'ADR).
2. **`src/payload/skills/op-roadmap/SKILL.md`** — étape 2 (milestones) : ajouter
   expand–contract comme exception nommée au slicing vertical. Étape 3 (items) : remplacer le
   « where possible » par les trois règles de tranche + la déclaration `blocked-by` par item +
   le réflexe prefactoring. Étape 5 (exécution) : « prendre le premier item » devient
   « prendre un item de la **frontière** du milestone actif ».
3. **`src/payload/operator/templates/roadmap.md`** (vérifier le chemin réel du template dans
   le payload) : format des items sous chaque milestone avec `blocked-by:` optionnel, et la
   section Sequencing recentrée sur les dépendances *inter-milestones* (les intra-milestone
   étant portées par les items).
4. **`op-status`** (léger, optionnel) : si le skill roll-up les projets, afficher la frontière
   du milestone actif (« travaillable maintenant : … »). Ne le faire que si ça reste de la
   lecture pure.
5. **Tests** : si le format `blocked-by:` devient parsable par un outil (op-status, gate), le
   parseur a un test ; si c'est du markdown pour agents seulement, pas de test mécanique — le
   dire dans l'ADR.

## Critères d'acceptation

1. L'ADR est écrit et tranche l'emplacement des arêtes.
2. op-roadmap énonce les trois règles de tranche (chemin complet/étroit, démontrable seul,
   une session), expand–contract, le prefactoring et la frontière.
3. Le template de roadmap montre un exemple d'item avec `blocked-by:`.
4. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- Ne pas réintroduire le fan-out du backlog : « create items as you reach them » reste la loi —
  les arêtes se déclarent sur les *noms* d'items de la roadmap, pas en créant les workitems.
- Ne pas gater mécaniquement la roadmap (ADR-0015 : artefact de planification approuvé par
  l'operateur, jamais par `op.mjs`). La frontière est une discipline de lecture, pas une gate.
- Le tracker d'issues de Matt (GitHub/GitLab, sub-issues natives) ne nous concerne pas : notre
  état vit dans le dépôt, zéro réseau.
