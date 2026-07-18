# Item 06 — Règle de durabilité des briefs longue durée

- **Milestone** : M4 · **Dépendances** : item 04 (`done` d'abord — même fichiers) · **ADR** : non
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §3
  (ligne triage / AGENT-BRIEF) et §5.

## Contexte

Un work item de roadmap peut être nommé des semaines avant d'être construit. Si sa description
cite des chemins de fichiers, des noms de fonctions ou des numéros de ligne, elle est périmée
au moment du build — et un agent qui la suit littéralement travaille sur un état du code qui
n'existe plus. Matt formalise ça dans `AGENT-BRIEF.md` : **durabilité > précision** pour tout
artefact à longue durée de vie. À distinguer chez nous des artefacts *courts* : les Tasks
écrites par op-plan juste avant le build citent des chemins à raison (elles vivent des heures,
pas des semaines) — la règle ne s'applique qu'aux artefacts qui traversent le temps.

## Source d'inspiration

- `skills/engineering/triage/AGENT-BRIEF.md` — lire en entier : décrire par **interfaces,
  types et contrats de comportement** (« ce qui doit être vrai »), jamais par chemins/lignes
  (« où c'est aujourd'hui ») ; **comportemental, pas procédural** (le quoi et le pourquoi, pas
  la liste des gestes) ; critères d'acceptation testables ; frontières de scope explicites ;
  avec gabarits et bons/mauvais exemples pour bug, enhancement et PR.
- `skills/engineering/to-spec/SKILL.md` — la même règle côté spec (« pas de chemins de
  fichiers ni de snippets »), et son **exception précise** : un snippet issu d'un prototype
  qui encode une décision plus fidèlement que la prose (machine à états, schéma, type).

## Quoi construire

1. **`src/payload/skills/op-roadmap/SKILL.md`** (étape 3, items) : une règle courte — les
   items de roadmap se décrivent par comportement observable et contrat, jamais par chemins ni
   symboles du code actuel ; un exemple bon/mauvais en une ligne chacun
   (« a guest can filter listings by date range » vs « add `filterByDate()` in
   `src/search/filters.ts` »).
2. **Template de roadmap** (même fichier que l'item 04) : refléter la règle dans l'exemple
   d'item.
3. **`src/payload/skills/op-discover/SKILL.md`** (léger) : le brief de problème est déjà
   naturellement comportemental — vérifier et, si besoin, une demi-phrase dans le format du
   brief (« in the operator's terms, not the codebase's »).
4. **Portée négative explicite** quelque part dans op-roadmap : rappeler que les Tasks
   d'op-plan et le Scope des workitems citent des chemins *à raison* (le Scope est mesuré sur
   le vrai diff par la gate — il DOIT être en chemins). La règle de durabilité ne s'applique
   qu'aux artefacts dont la durée de vie dépasse la fenêtre de planification.

## Critères d'acceptation

1. op-roadmap contient la règle avec l'exemple bon/mauvais et la démarcation nette
   (items de roadmap : comportement ; Scope/Tasks d'op-plan : chemins).
2. Le template d'item la reflète.
3. Ajout net total ≤ ~15 lignes.
4. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- Ne pas étendre la règle aux specs d'op-plan : chez Matt la spec est durable (elle vit sur un
  tracker en amont des tickets) ; chez nous `spec-lite.md`/`spec.md` est écrit juste avant le
  build et l'exactitude y prime. Seuls la roadmap et le brief de discovery traversent le temps.
- Ne pas importer les gabarits complets d'AGENT-BRIEF (bug/enhancement/PR) : notre workitem.md
  a déjà son format ; on prend le *principe*, pas les formulaires.
