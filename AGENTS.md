# AGENTS.md

Guide des agents qui **développent** le toolkit Operator. (Importé par `CLAUDE.md` via `@AGENTS.md`.)

À ne pas confondre avec le bloc que le toolkit **installe** chez l'utilisateur
(`src/payload/agents-block.md`) : ce fichier-ci ne part jamais dans la distribution.

---

## Mission

**Operator** est un toolkit de développement assisté par l'IA. Il fait travailler les agents de
code comme une équipe d'ingénieurs seniors : **l'humain décide, Operator organise, les agents
exécutent.** Là où un modèle laissé seul code avant de comprendre, prétend « tests passés » sans
les lancer, transforme un correctif de deux lignes en refactor et oublie tout à la fin de la
session, Operator impose une méthode — comprendre, planifier, construire dans un périmètre
déclaré, vérifier par la preuve, mémoriser ce qui a été appris — et la matérialise en fichiers
versionnés dans le dépôt de l'utilisateur.

Le toolkit se comporte en **employé** de l'operateur (l'humain) : il applique le SOP à chaque
fois, ne freelance jamais hors du mandat reçu.

---

## Frontière `/src` — la règle non négociable

Tout ce qui est **distribué** vit dans `/src`. Tout ce qui est **en dehors de `/src`** est
l'environnement de développement (ce fichier, `start.md`, `docs/adr/`, le skill `skill-creator`,
les scripts de dev, etc.) et ne fait PAS partie du toolkit.

- `/src` est la seule source du toolkit ; `package.json` déclare `files: ["src"]`, donc seul
  `src/` est publié — c'est l'application mécanique de cette frontière.
- Ne jamais faire fuir dans le toolkit un outil, un skill ou une instruction venant de
  l'environnement de dev. En particulier `skill-creator` **outille** la création des skills
  distribués mais n'est lui-même **pas** distribué.
- Fichiers du toolkit (`/src`) : **toujours en anglais.** Les docs de l'environnement de dev
  (dont ce fichier) restent en français — la règle anglais-only ne vise que ce qui est livré.

---

## État du toolkit (aujourd'hui)

Le toolkit est construit et testé. Carte pour s'orienter avant de contribuer.

**Distribution.** Paquet `@marcjosia/operator` (v0.1.0), ESM, **zéro dépendance runtime**,
Node ≥ 18. Installé via `npx --yes github:Marc-Josia/operator <cmd>`. CLI installeur
(`src/bin/operator.mjs`) : **5 sous-commandes** — `init`, `update`, `doctor`, `status`, `remove`.
`update` est un three-way merge sans réseau qui ne touche jamais `work/`, `memory/`, `projects/`,
`config.json`. **5 adapters** (`src/lib/adapters/`) : `claude` et `gemini` écrivent (import
`@AGENTS.md` dans `CLAUDE.md` + miroir `.claude/skills/` ; `contextFileName` pour Gemini) ;
`codex`, `opencode`, `cursor` sont **verify-only** (ils lisent `AGENTS.md` et `.agents/skills/`
nativement, rien à écrire).

**Ce qu'`init` pose dans un projet.**
- Un **bloc managé** injecté dans `AGENTS.md` entre marqueurs `<!-- operator:begin v<version> -->` /
  `<!-- operator:end -->` — le reste du fichier de l'utilisateur est préservé.
- Les **skills** dans `.agents/skills/` (miroir `.claude/skills/` pour Claude Code).
- Le dossier **`.operator/`** : `constitution.md`, `gates.json`, `config.json`, `bin/op.mjs`
  (le vérificateur de gates, zéro-dép), `templates/`, `memory/`, puis `work/` et `projects/`
  créés au fil de l'eau.

**Le pipeline.** Tout travail passe par un *work item* traversant
`intake → spec → build → review → ship → done`. Le process est dimensionné par **3 lanes**
choisies au triage : `quick` (pas de spec, caps durs 3 fichiers / 80 lignes mesurés sur le vrai
diff), `standard` (`spec-lite.md`), `full` (`spec.md` + ADRs). **Les gates sont vérifiées, pas
affirmées** : `node .operator/bin/op.mjs gate <id>` mesure le diff git réel, coche les preuves,
puis avance l'étape lui-même. `op.mjs` a **3 sous-commandes** : `status`, `gate`, `escalate`.

**Les skills — 15, sur deux contrats** (le mécanisme : ADR-0005 ; `op-discover` et `op-roadmap`
ajoutés par ADR-0014/0015, `op-explore` par ADR-0019, `op-init` par ADR-0022).
- **11 procédures `op-*`** (seules autorisées à déplacer l'état d'un work item) :
  `op-init` (onboarding : survey + profil de communication dans `AGENTS.md` + choix du tracker
  markdown/GitHub/Linear), `op-discover`
  (cadrer un besoin flou), `op-explore` (naviguer un projet brumeux : carte de
  décisions, collapse vers la roadmap), `op-roadmap` (découper un projet en roadmap de
  milestones), `op-new` (intake + triage), `op-plan` (spec), `op-build` (implémentation),
  `op-fix` (bug, repro d'abord), `op-ship` (revue + livraison + mémoire), `op-status`
  (lecture seule), `op-memory` (mémoire durable).
- **4 packs d'expertise `operator-*`** (conseil uniquement, ne touchent jamais l'état) :
  `operator-code-review`, `operator-security-review`, `operator-test-strategy`,
  `operator-debugging`.
- **Routage opt-in** (ADR-0021) : par défaut l'agent reste un agent de code normal et ne route
  rien. Le routage ne s'enclenche que lorsque l'operateur commence son message par `/operator` ;
  le bloc toujours chargé porte cette bascule (défaut off, `/operator` on) et pointe vers la
  constitution. Une fois enclenché, l'agent est le routeur : il classe et dispatche. Échelle de
  taille : flou → `op-discover`, confirmé mais brumeux → `op-explore`, projet → `op-roadmap`,
  changement précis → `op-new` ; un bug → `op-fix`. La `constitution.md` fait autorité (elle
  porte l'arbre complet) ; le bloc en est le résumé.

**État & mémoire.** `workitem.md` est la source de vérité d'un item (frontmatter plat dont
`project`/`milestone`/`tracker_ref`, Journal append-only) — y compris quand le travail est
*tracké* dans GitHub/Linear : le tracker externe n'est qu'un miroir (ADR-0022 ; `tracker` dans
`config.json`), jamais la source de vérité, car `op.mjs` est zéro-réseau. Un gros effort a un `.operator/projects/<id>/roadmap.md`
(milestones → work items), précédé d'un `map.md` (carte de décisions `op-explore`) quand la voie
est encore brumeuse — approuvés par l'operateur mais **non gatés** mécaniquement. Mémoire
plafonnée dans `.operator/memory/` : `project.md` (120), `conventions.md` (200), `lessons.md` (150),
plus `decisions/` (ADRs) et `archive/`.

---

## Conventions de contribution

- **Créer un skill** → toujours via `/skill-creator`. Écrire en anglais, sous
  `src/payload/skills/<name>/SKILL.md`. Préfixe = contrat : `op-*` = procédure, `operator-*` =
  expertise. Éviter le piège YAML du deux-points-espace (`": "`) dans une `description:` non quotée
  — il casse les parseurs stricts (Codex/OpenCode/Cursor/Gemini) ; quoter ou reformuler. Suivre
  les règles « Écrire un skill » ci-dessous.
- **Écrire un skill** — six règles d'authoring (théorie et baseline :
  `docs/inspirations/mattpocock-skills/`, item 03 et son rapport) :
  1. **Description = déclencheurs, une phrase par branche.** Chaque branche de comportement a une
     seule phrase-déclencheur ; les synonymes qui re-déclenchent la même branche sont de la
     duplication. Front-loader le leading word ; ne pas re-dire l'identité déjà dans le corps.
     Cible : 60–90 mots — la description est du context load permanent chez les hôtes à
     model-invocation, multiplié par 15 skills.
  2. **Chaque étape finit sur un critère de complétion checkable.** Les étapes gatées l'ont via
     `op.mjs` ; une étape non gatée le dit en toutes lettres (« it ends when… »).
  3. **Test du no-op, phrase par phrase.** Une phrase qui ne change pas le comportement par
     rapport au défaut du modèle se supprime entière — jamais raccourcie mot à mot.
  4. **Positif d'abord.** Formuler le comportement cible ; une interdiction ne reste que comme
     garde-fou dur et finit toujours par le geste à faire à la place (le format des sections
     « Failure modes »).
  5. **Leading words comme tokens.** Les concepts récurrents du payload — *honest*, *fresh*,
     *append-only*, *mandate*, *escalate*, *shotgun*, *harvest*, *grill* — se répètent comme
     tokens, jamais paraphrasés. Préférer un mot pré-entraîné à un mot inventé.
  6. **Single source of truth inter-fichiers.** La constitution fait autorité, le bloc en est le
     résumé ; un skill ne re-dit une politique qu'au point d'exécution où elle s'applique. Pas
     d'axe user-invoked/model-invoked (`disable-model-invocation`) dans le payload sans ADR
     dédié — le contrat `op-*`/`operator-*` est notre équivalent agent-agnostique.

  Nota : le `/skill-creator` (outil de dev, non distribué) conseille des descriptions « pushy » ;
  pour le payload Operator, les règles ci-dessus priment — le routage vit dans le bloc toujours
  chargé (ADR-0013), la description n'est qu'un second filet.
- **Après toute modif sous `src/payload/`** → régénérer le manifest :
  `node src/lib/manifest.mjs build`, puis vérifier avec `node src/lib/manifest.mjs verify` avant de
  committer (il signale toute dérive ; il n'y a pas encore de CI pour l'attraper à ta place).
- **Avant de conclure** → lancer la suite : `npm test`
  (`node --test "src/test/**/*.test.mjs"`, 95 tests). Toute nouvelle behavior de `src/lib`/`op.mjs`
  mérite un test.
- **Le bloc `src/payload/agents-block.md` reste ≤ 60 lignes** (il est chargé à chaque tour) — le
  détail va dans `constitution.md`, dont le bloc est le résumé.
- **Décision d'architecture significative** → un ADR dans `docs/adr/` (`NNNN-slug.md`). 22 ADRs
  existent (0001–0022) ; ne pas réécrire un ADR accepté, en ajouter un nouveau qui le supersède
  (ex. 0021 supersède 0013 : routage opt-in via `/operator`).
- **Zéro dépendance runtime, jamais de réseau** dans le toolkit (installeur comme `op.mjs`) : Node
  builtins uniquement.
- **Agent-agnostique** : toute évolution doit fonctionner sur Claude Code, Codex, OpenCode, Cursor
  et Gemini — pas seulement Claude.

---

## Où trouver quoi

- `src/README.md` — documentation utilisateur (install, quickstart, méthode, commandes).
- `src/payload/operator/constitution.md` — valeurs, lois, politique d'orchestration (fait autorité).
- `docs/adr/` — les décisions d'architecture et leur pourquoi.
- `src/test/` — les tests ; `src/lib/` — l'installeur ; `src/payload/` — ce qui est livré.
