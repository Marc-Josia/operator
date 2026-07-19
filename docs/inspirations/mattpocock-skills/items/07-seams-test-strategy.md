# Item 07 — Seams et surface de test dans `operator-test-strategy`

- **Milestone** : M3 · **Dépendances** : item 03 (`done` d'abord — même fichier) · **ADR** : non
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §3
  (lignes tdd et codebase-design).

## Contexte

`operator-test-strategy` (`src/payload/skills/operator-test-strategy/SKILL.md`) couvre déjà :
pyramide et placement par type de changement, mapping AC→tests, quoi ne pas tester (dont les
détails d'implémentation et les internals de frameworks), politique flaky, choix du test de
régression. Trois choses du `tdd` de Matt lui manquent :

1. Le concept de **seam** comme vocabulaire de première classe — nos skills disent « at the
   seam » trois fois sans jamais définir le terme ni dire comment *choisir* le seam.
2. La **confirmation des seams avec l'operateur avant d'écrire les tests** — chez Matt, les
   seams sous test se conventionnent au moment de la spec, pas au moment d'écrire.
3. Une **politique de mock** explicite (nous avons « stub of the documented contract » pour
   les API tierces, mais pas la règle générale).

## Source d'inspiration

- `skills/engineering/tdd/SKILL.md` — le leading word **« the interface is the test
  surface »** ; la confirmation des seams avant tout test ; l'anti-pattern **tautological
  test** (la valeur attendue doit venir d'une source de vérité *indépendante* de
  l'implémentation — pas recalculée par le même code).
- `skills/engineering/tdd/mocking.md` — la politique : mocker **uniquement aux frontières
  système** (réseau, horloge, filesystem, services tiers) ; **jamais ses propres modules** ;
  concevoir pour la mockabilité (injecter les dépendances, interfaces étroites style SDK
  plutôt que fetchers génériques).
- `skills/engineering/tdd/tests.md` — les exemples GOOD/BAD concrets (vérifier via
  l'interface publique vs lire la DB directement ; tautologique vs littéral connu), utiles
  comme modèles de nos exemples.
- `skills/engineering/codebase-design/SKILL.md` — définition compacte de *seam* et *adapter*
  (« one adapter = hypothetical seam, two = real ») pour la définition d'une ligne.

## Quoi construire

Dans `src/payload/skills/operator-test-strategy/SKILL.md` :

1. Une courte section **« Seams — where tests attach »** : définition (la frontière stable où
   un comportement s'observe et se substitue), « the interface is the test surface » comme
   règle, comment choisir (le seam le plus haut qui rend le comportement réel sans mocker ses
   propres modules ; le plus bas qui exerce le vrai défaut pour une régression — cohérent avec
   la section régression existante).
2. Une section **« Mocking policy »** : frontières système uniquement ; jamais ses propres
   modules (si tester sans mocker un module interne est impossible, c'est un constat de design
   à remonter dans le plan retourné — champ `for the operator:`) ; anti-pattern tautologique.
3. **Câblage amont** : dans le mapping AC→tests, l'étape « choose the lowest pyramid level »
   devient « choose the seam » (même geste, vocabulaire unifié). Et une ligne dans
   `op-plan` (étape Tasks) : chaque tâche nomme déjà sa preuve — préciser que la preuve nomme
   son **seam** quand elle est un test, ce qui matérialise la « confirmation des seams » de
   Matt *dans* l'approbation du plan (pas de nouveau point d'arrêt HITL : le mandat couvre
   les seams).

## Critères d'acceptation

1. `operator-test-strategy` définit seam, porte la règle « the interface is the test
   surface », la politique de mock et l'anti-pattern tautologique, avec un exemple bon/mauvais.
2. `op-plan` demande le seam dans la preuve des tâches-test (une phrase).
3. Ajout net ≤ ~35 lignes sur test-strategy (élaguer les redites que la section seams absorbe,
   notamment les mentions éparses de « seam » désormais définies à un seul endroit).
4. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- Pas de nouveau point de blocage humain : chez Matt la confirmation des seams est une
  question à l'utilisateur ; chez nous elle passe par l'approbation du plan, qui existe déjà.
- Le pack reste conseil pur (`operator-*`) : il retourne un plan, ne touche jamais l'état.
- Ne pas importer le TDD-red-green comme procédure : op-build a sa propre discipline de
  preuve par tâche ; cet item n'ajoute que le vocabulaire seam/surface/mock.
