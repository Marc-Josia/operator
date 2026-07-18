# Item 08 — Test « le routeur ne ment jamais »

- **Milestone** : M1 · **Dépendances** : aucune · **ADR** : non
- **Avant de commencer** : lire `../README.md` (contrat commun).

## Contexte

Chez Matt, l'invariant « le routeur (`ask-matt`) doit être resynchronisé à chaque
ajout/renommage/suppression de skill — un routeur qui ment est un défaut » est **manuel**
(consigné dans son `CLAUDE.md`). Chez nous, le routeur est `src/payload/agents-block.md`
(tableau de routage + liste des packs) et la `constitution.md` (section Routing) — et nous
avons une culture de vérification mécanique (`op.mjs`, manifest, 95 tests) mais aucun test ne
garantit que le routeur couvre les skills réellement livrés. Le jour où un 14e skill est
ajouté sans ligne de routage, aucun harnais ne le dispatchera et personne ne le verra.

## Source d'inspiration

Conceptuelle uniquement : `CLAUDE.md` et `.agents/invocation.md` chez Matt (l'invariant du
router et les « invariants de promotion » — chaque skill promu doit apparaître dans le README,
le plugin.json et les docs). Nous transformons son invariant déclaratif en test exécutable —
c'est précisément notre différence de philosophie (vérifié, pas affirmé), appliquée à
nous-mêmes.

## Quoi construire

Un fichier de test Node natif dans `src/test/` (même style que les tests existants —
`node --test`, zéro dépendance) qui vérifie :

1. **Couverture du routeur** : chaque répertoire de `src/payload/skills/<name>/` apparaît par
   son nom exact au moins une fois dans `src/payload/agents-block.md` **et** dans la section
   Routing de `src/payload/operator/constitution.md`.
2. **Pas de fantômes** : chaque nom `op-*`/`operator-*` mentionné dans le bloc et la
   constitution correspond à un répertoire de skill existant (attrape les renommages).
3. **Budget du bloc** : `agents-block.md` fait ≤ 60 lignes (la règle d'AGENTS.md, jusqu'ici
   non testée).
4. **Cohérence frontmatter** : le `name:` du frontmatter de chaque `SKILL.md` égale le nom de
   son répertoire (dérive silencieuse classique).
5. Si le README du payload (`src/README.md`) liste les skills : même vérification de
   couverture/fantômes — à confirmer en lisant le fichier ; si la liste n'y est pas
   structurée, ne pas l'inventer.

Regarder d'abord `src/test/` et `src/lib/manifest.mjs` : si un test ou le verify du manifest
couvre déjà une de ces vérifications, ne pas la dupliquer — étendre l'existant.

## Critères d'acceptation

1. Le test échoue si on ajoute un répertoire de skill bidon sans le router, si on cite un
   skill inexistant, si le bloc passe 61 lignes, ou si un `name:` diverge (vérifier ces quatre
   cas à la main en les provoquant, puis les défaire).
2. La suite complète passe sur l'état actuel du payload — si le test révèle une incohérence
   *existante*, la corriger fait partie de l'item (et c'est sa première victoire).
3. `npm test` vert, manifest inchangé (item sans modification du payload — sauf correction
   d'incohérence révélée).

## Garde-fous

- Extraire les noms par motif strict (`op-[a-z-]+`, `operator-[a-z-]+` en mot entier) pour ne
  pas matcher de la prose par accident ; en cas de doute, préférer un test plus tolérant qui
  ne crie jamais à tort — un garde-fou qui fausse-alerte finit désactivé.
- Ne pas transformer ce test en linter général des skills : périmètre = le routeur ne ment
  pas, rien d'autre. (L'audit de contenu, c'est l'item 03.)
