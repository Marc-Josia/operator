# Item 10 — `op-explore` : le mode fog of war / wayfinder

- **Milestone** : M5 · **Dépendances** : item 04 (`done` — le format `blocked-by:`/frontière
  d'ADR-0018 est réutilisé tel quel) · **ADR** : oui (nouveau, s'appuie sur ADR-0014, 0015, 0018)
- **Avant de commencer** : lire `../README.md` (contrat commun), `../reference.md` §3 (ligne
  wayfinder) et §5, `docs/adr/0014-discovery-precedes-intake.md`,
  `docs/adr/0015-project-layer-above-work-items.md`,
  `docs/adr/0018-vertical-slice-discipline-and-blocking-edges.md`.

## Contexte

Le pipeline couvre le flou (`op-discover` → problem brief en une session), le gros
(`op-roadmap` → milestones taillables) et le précis (`op-new`). Il reste un trou entre les
deux premiers : **le problème est confirmé mais l'espace de solution est encore inconnaissable**
— trop brumeux pour tailler M1 en tranche verticale démontrable, trop gros pour une session.
Le travail des prochaines sessions n'est pas de construire mais de **résoudre des décisions**
(recherche, prototypes jetables, interviews), jusqu'à ce que la voie se dégage. Aujourd'hui ce
cas n'a ni procédure ni état persistant : la section « Risks & open questions » du roadmap est
un parking passif, et `op-discover` s'arrête au brief.

## Décisions déjà actées (operateur, 2026-07-19)

Ne pas re-litiger ; l'ADR les motive et les fige.

1. **Nouveau skill `op-explore`** — 10e procédure `op-*` (14 skills au total). Pas un mode
   d'`op-roadmap`.
2. **Les décisions ne sont pas des work items.** Aucune gate, aucune lane : les gates mesurent
   des diffs, une décision n'en a pas. Même régime qu'`op-discover`/`op-roadmap` : procédure
   non gatée, approuvée par l'operateur.
3. **La carte vit dans `.operator/projects/<id>/map.md`** — à côté du futur `roadmap.md`, même
   dossier projet ; le collapse écrit `roadmap.md` au même endroit et l'historique
   d'exploration reste visible. (`projects/` est déjà user-owned pour `update`/`remove`,
   ADR-0015 — aucun changement d'installeur.)
4. **Test fog of war** — une décision va sur la carte si l'on peut *poser la question
   précisément* (pas « y répondre ») ; sinon elle reste en section « Not yet specified ».
5. **« Hand off, don't build. »** `op-explore` planifie et résout des décisions, il ne
   construit jamais. Sortie = **collapse** : quand la frontière se vide assez pour tailler M1,
   route vers `op-roadmap` qui écrit le `roadmap.md`.
6. **Règle dure prototype : spike code never ships.** Un prototype vit sur une branche/worktree
   jetable ; son livrable est la réponse journalisée dans la carte, jamais le code. Du code de
   spike qui s'avère bon re-rentre par un work item gaté normal.
7. **Une décision résolue par session max** — discipline énoncée dans le skill (comme la
   frontière d'ADR-0018 : discipline de lecture, jamais une gate).

## Source d'inspiration

- `skills/engineering/wayfinder/SKILL.md` chez Matt — lire en entier. À prendre : la carte de
  tickets-décision ; les **types** de décision — *research* (faits, AFK), *prototype* (jetable),
  *grilling* (décision d'intent, HITL — chez nous : la mécanique d'interview d'`op-discover`,
  une question à la fois ou frontier mode) ; la section « Not yet specified » et son test ;
  « une décision par session » ; le collapse vers la spec (chez nous : vers `op-roadmap`).
  À laisser : son issue tracker (notre état est du markdown local, zéro réseau).
- Le format des arêtes est **déjà chez nous** : `blocked-by:` sur les lignes d'items +
  frontière travaillable (ADR-0018). La carte l'applique à des décisions au lieu d'items —
  markdown pour agents, pas de parseur (même position qu'ADR-0018).
- La règle de durabilité (item 06) s'applique aux décisions de la carte : formulées en
  comportement observable/question d'intent, jamais en chemins ou symboles du code du jour.

## Quoi construire

1. **ADR** (`docs/adr/0019-…`) : le mode exploration — les sept décisions ci-dessus, leurs
   raisons, la frontière avec `op-discover` (amont : problème non confirmé) et `op-roadmap`
   (aval : milestones taillables). Y trancher le cycle de vie de `map.md`
   (ex. `status: exploring → collapsed`) et le vocabulaire Journal.
2. **`src/payload/skills/op-explore/SKILL.md`** — via `/skill-creator`, règles d'authoring
   d'AGENTS.md (description 60–90 mots, une phrase-déclencheur par branche, leading words :
   *fog of war*, *frontier*, *collapse*, *hand off*, *throwaway*). Entry : brief `op-discover`
   confirmé mais milestones intaillables, ou `op-roadmap` qui bute en taillant. Steps : poser
   la carte (décisions typées, `blocked-by:`, « Not yet specified ») → travailler la frontière
   une décision par session (research = fait recherché ; grilling = interview d'`op-discover` ;
   prototype = worktree jetable sous règle dure) → journaliser chaque résolution (ADR via
   `op-memory` si structurante, `out-of-scope/` si direction écartée) → collapse vers
   `op-roadmap`. Exit : pas de gate mécanique ; approbation operateur de la carte, puis du
   collapse.
3. **`src/payload/operator/templates/map.md`** — frontmatter (id, title, status, dates), la
   carte (décisions typées avec `blocked-by:`), « Not yet specified » (avec le test en
   commentaire), Journal append-only, Progress. Calquer la voix du template `roadmap.md`.
4. **Routage — les trois surfaces que `router.test.mjs` pin** : une ligne dans la table
   d'`agents-block.md` + le rung d'échelle (« problème confirmé mais voie inconnaissable ? →
   `op-explore` ») **sans crever le budget de 60 lignes** (condenser si besoin) ; la section
   Routing de `constitution.md` ; la liste Skills de `src/README.md` (+ les comptes 13→14,
   9→10, deux occurrences README ligne 52 et 334).
5. **Handoffs existants** : `op-discover` étape 6 gagne la branche « confirmé mais
   inconnaissable → op-explore » ; `op-roadmap` (entry/failure modes) renvoie vers `op-explore`
   quand M1 ne se taille pas. Une phrase chacun — single source of truth, le détail vit dans
   `op-explore`.
6. **Comptes hors payload** : AGENTS.md (« 13 skills », « 9 procédures ») et tout autre
   décompte trouvé par grep.
7. **Manifest + tests** : `node src/lib/manifest.mjs build` puis `verify` ; `npm test` vert
   (router.test.mjs impose déjà la synchro des trois surfaces). Pas de parseur de carte, donc
   pas de nouveau test mécanique — le dire dans l'ADR, comme ADR-0018.

## Critères d'acceptation

1. L'ADR est écrit et fige les sept décisions + le cycle de vie de `map.md`.
2. `op-explore` livré avec le template `map.md` ; description conforme aux règles d'authoring.
3. Les trois surfaces de routage nomment `op-explore` ; `agents-block.md` ≤ 60 lignes.
4. `op-discover` et `op-roadmap` routent vers `op-explore` en une phrase chacun.
5. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- **Ne pas gater la carte** : `op.mjs`, `gates.json` et le template workitem ne bougent pas.
  Une décision n'est jamais un work item ; seul le code issu du collapse (ou réhabilité d'un
  spike) entre dans le pipeline.
- **Ne pas dupliquer l'interview** : `op-explore` *invoque* la mécanique d'`op-discover` pour
  les décisions grilling, il ne la réécrit pas (single source of truth).
- **Ne pas créer un 3e emplacement d'état** : tout vit sous `.operator/projects/<id>/`, déjà
  préservé par `update`/`remove`.
- **Le spike ne fuit pas** : jamais de merge d'une branche de prototype ; la règle est dure et
  finit par le geste (« re-enter through a gated work item »).
