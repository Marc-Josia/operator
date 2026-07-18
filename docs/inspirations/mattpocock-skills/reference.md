# Référence — le repo `mattpocock/skills`

Synthèse de l'analyse du 2026-07-18 (état du repo au 2026-07-16). Objectif : donner à un agent
tout le contexte nécessaire pour comprendre *de quoi on parle* dans les briefs d'items, et où
aller lire chez Matt quand un brief le demande. Les chemins sont relatifs à la racine d'un
clone de https://github.com/mattpocock/skills.

---

## 1. Philosophie et positionnement

Une bibliothèque de **skills agentiques** (format `SKILL.md` + frontmatter YAML, standard
« Agent Skills », chargés par Claude Code et Codex) pour le « real engineering » par opposition
au « vibe coding ». Positionnement explicite contre GSD/BMAD/Spec-Kit, accusés de confisquer le
contrôle. Les skills se veulent **petits, adaptables, composables, indépendants du modèle**,
fondés sur des classiques (Pragmatic Programmer, DDD d'Evans, XP de Beck, *A Philosophy of
Software Design* d'Ousterhout).

Le `README.md` organise tout autour de **4 modes d'échec** des agents :

1. *L'agent n'a pas fait ce que je voulais* → désalignement → **grilling** (interview).
2. *L'agent est trop verbeux / à côté* → pas de langage partagé → **CONTEXT.md** (glossaire).
3. *Le code ne marche pas* → boucles de feedback insuffisantes → **tdd**, **diagnosing-bugs**.
4. *On a construit une boule de boue* → entropie accélérée par l'IA → **to-spec**,
   **codebase-design**, **improve-codebase-architecture**.

Différence structurelle avec Operator : chez Matt, **rien n'est vérifié mécaniquement** — tout
repose sur la qualité du prompt et la discipline de l'agent. Operator garde ses gates (`op.mjs`
mesure le diff réel) ; on pioche chez Matt la finesse procédurale et la théorie d'authoring,
pas son modèle d'exécution.

## 2. Architecture d'ensemble

### Où vit l'état

L'état est **externalisé sur disque et/ou sur un issue tracker**, jamais implicite dans le
contexte :

- **Config par dépôt** (posée une fois par `setup-matt-pocock-skills`) : `docs/agents/issue-tracker.md`
  (quel tracker, quelles commandes CLI), `docs/agents/triage-labels.md` (mapping de 5 rôles
  canoniques vers les vraies étiquettes), `docs/agents/domain.md` (règles de lecture des docs
  de domaine), plus un bloc `## Agent skills` dans `CLAUDE.md` **ou** `AGENTS.md`.
- **Modèle de domaine** : `CONTEXT.md` (glossaire strict, format `**Terme**:` + `_Avoid_:`) et
  `docs/adr/NNNN-slug.md`, créés **paresseusement** (jamais de scaffolding prématuré ; si
  absents, les skills « proceed silently »).
- **Issue tracker** : GitHub (`gh`), GitLab (`glab`) ou markdown local `.scratch/<feature>/`.
  Specs, tickets, notes de triage et cartes wayfinder y vivent.
- **Base des refus** : `.out-of-scope/<concept>.md` — un fichier par concept *rejeté*.

### Le modèle d'invocation (axe structurant)

Chaque skill est soit **user-invoked** (`disable-model-invocation: true` ; atteignable
uniquement si l'humain tape la commande ; description human-facing ; zéro coût de contexte
mais coût cognitif — l'humain doit s'en souvenir), soit **model-invoked** (description riche
en phrases-déclencheurs, chargée dans le contexte à chaque tour — un **context load**
permanent). Règles : model-invoked *seulement si* l'agent ou un autre skill doit l'atteindre
seul ; quand les user-invoked dépassent le mémorisable, un **router skill** (`ask-matt`) les
indexe. Un skill user-invoked peut invoquer des model-invoked, jamais l'inverse. Les
dépendances entre skills s'expriment **en prose façon `/skill`** (« Run a `/grilling`
session »), jamais par cross-référence de fichier profonde.

### Le pipeline principal

`setup-matt-pocock-skills` (config, une fois) → `ask-matt` (routeur) → **flux principal** :
`grill-with-docs` (interview + écriture de `CONTEXT.md`/ADR au fil de l'eau) → détours
optionnels `prototype`/`research` (bridgés par `handoff`) → `to-spec` (spec publiée
`ready-for-agent`) → `to-tickets` (tranches verticales + arêtes de blocage) → `implement`
(pilote `tdd`, clôt par `code-review`) → commit. **Rampes d'accès** : `triage` (issues
entrantes → agent-ready), `diagnosing-bugs` (bugs durs), `wayfinder` (chantiers énormes →
carte de décisions qui « collapse » vers `to-spec`). **Couches de vocabulaire** :
`domain-modeling` (glossaire de domaine) et `codebase-design` (glossaire d'architecture).

## 3. Les skills clés (avec chemins sources)

| Skill | Chemin | Ce qu'il faut en retenir |
|---|---|---|
| grilling | `skills/productivity/grilling/SKILL.md` | Cœur réutilisable de l'interview : arbre de décision branche par branche, **une question à la fois**, **réponse recommandée à chaque question**, faits recherchés par l'agent / décisions demandées à l'humain, rien n'est exécuté avant confirmation. (Notre `op-discover` en est déjà très proche.) |
| batch-grill-me | `skills/in-progress/batch-grill-me/SKILL.md` | Variante par lots : modéliser le **design tree**, poser **toute la frontière** (décisions dont les prérequis sont réglés) en un round de questions numérotées, recalculer la frontière à chaque round, sous-agents non-bloquants pour les faits. Fini quand la frontière est vide. |
| diagnosing-bugs | `skills/engineering/diagnosing-bugs/SKILL.md` + `scripts/hitl-loop.template.sh` | 6 phases. Phase 1 = **construire une boucle de feedback** (10 moyens ordonnés, du test échouant au script HITL) ; garde-fou : « **No red-capable command, no Phase 2** ». Puis : minimiser la repro une coupe à la fois ; **3–5 hypothèses classées, falsifiables, montrées à l'utilisateur avant test** ; instrumentation taguée `[DEBUG-xxxx]` (nettoyage par grep) ; test de régression écrit avant le fix **si un seam correct existe — sinon l'absence de seam est le constat** (hand-off architecture) ; post-mortem « qu'est-ce qui aurait empêché ce bug ? ». |
| to-tickets | `skills/engineering/to-tickets/SKILL.md` | Découpage en **tranches verticales** : chaque ticket traverse toutes les couches (chemin complet mais étroit), **démontrable seul**, **dimensionné pour une fenêtre de contexte fraîche**, déclare ses arêtes `blocked-by` ; on travaille la **frontière** (tickets dont tous les bloqueurs sont clos). Exception **wide refactors** : séquence **expand–contract** (construire à côté, migrer par lots dimensionnés par blast radius, contracter). Chercher le **prefactoring** (« make the change easy, then make the easy change »). Quiz de validation du découpage avec l'utilisateur avant publication. |
| to-spec | `skills/engineering/to-spec/SKILL.md` | Pure synthèse (interdiction d'interviewer — le grilling a eu lieu en amont). Confirmer les **seams** de test avec l'utilisateur. **Pas de chemins de fichiers ni de snippets** dans la spec — sauf un snippet issu d'un prototype qui encode une décision mieux que la prose. |
| triage | `skills/engineering/triage/SKILL.md` + `AGENT-BRIEF.md` + `OUT-OF-SCOPE.md` | Machine à états de triage (5 rôles). **Redundancy check** + **prior rejection check** contre `.out-of-scope/` avant de discuter. **Verify the claim** (reproduire le bug / vérifier que le PR fait ce qu'il prétend) *avant* tout grilling. `AGENT-BRIEF.md` : **durabilité > précision** — contrats de comportement et interfaces, jamais chemins de fichiers ni numéros de ligne (ça périme). |
| wayfinder | `skills/engineering/wayfinder/SKILL.md` | Chantiers au-delà d'une session : carte de **tickets-décision** sur le tracker. **Fog of war** : section « Not yet specified » pour les décisions pressenties mais pas encore formulables (test : « peux-tu poser la question précisément ? », pas « peux-tu y répondre ? »). Planifier, pas exécuter. Types de tickets research (AFK) / prototype, grilling, task (HITL). **Une décision résolue par session max.** Quand la voie est claire : « hand off, don't build » → `to-spec`. |
| tdd | `skills/engineering/tdd/SKILL.md` + `tests.md` + `mocking.md` | « **The interface is the test surface** ». **Confirmer les seams avec l'utilisateur avant d'écrire le premier test.** Anti-patterns : tests implementation-coupled, **tautologiques** (la valeur attendue doit venir d'une source indépendante), horizontal slicing. `mocking.md` : mocker **uniquement aux frontières système**, jamais ses propres modules ; concevoir pour la mockabilité (injection de dépendances). |
| codebase-design | `skills/engineering/codebase-design/SKILL.md` + `DEEPENING.md` + `DESIGN-IT-TWICE.md` | Vocabulaire imposé des **modules profonds** (Module, Interface, Depth, Seam, Adapter, Leverage, Locality) ; deletion test ; « one adapter = hypothetical seam, two = real ». `DESIGN-IT-TWICE.md` : **3+ sous-agents parallèles avec des contraintes de design radicalement différentes** (interface minimale / flexibilité max / cas commun / ports & adapters), comparaison par depth/locality/seam placement, recommandation opinionated. |
| code-review | `skills/engineering/code-review/SKILL.md` | **Deux sous-agents parallèles aux contextes isolés** : axe Standards (standards documentés + baseline de 12 smells Fowler) et axe Spec (fidélité à l'issue/PRD d'origine). Agrégation sans fusion ni re-ranking — la séparation empêche qu'un axe masque l'autre. |
| writing-great-skills | `skills/productivity/writing-great-skills/SKILL.md` + `GLOSSARY.md` | La théorie d'authoring — voir §4, c'est la pièce maîtresse. |
| handoff | `skills/productivity/handoff/SKILL.md` | Compacter une session en document de passation : section « suggested skills », référencer (pas dupliquer) specs/ADR/commits, **rédiger les secrets**. |
| ask-matt | `skills/engineering/ask-matt/SKILL.md` | Le routeur : carte complète des flux + « hygiène de contexte » (garder grill→spec dans une fenêtre non coupée ; « smart zone » ~120k tokens). Invariant : **un routeur qui ment est un défaut** — resynchronisé à chaque ajout/renommage de skill. |

## 4. La théorie d'authoring (`writing-great-skills`) — détaillée

C'est la contribution la plus originale du repo, et la base de notre item d'audit. Thèse : *un
skill existe pour arracher du déterminisme à un système stochastique* ; la vertu racine est la
**predictability** (même *processus* à chaque run, pas même output).

- **Deux coûts en tension.** Chaque skill model-invoked impose un **context load** permanent
  (sa description est dans le contexte à chaque tour) ; chaque skill user-invoked impose une
  **cognitive load** (l'humain doit s'en souvenir). Choisir l'invocation, c'est choisir quel
  coût payer.
- **Écrire la description** : front-loader le **leading word** ; **une phrase-déclencheur par
  branche** de comportement — les synonymes qui re-déclenchent la même branche sont de la
  duplication ; couper de la description l'identité déjà présente dans le corps.
- **Hiérarchie de l'information (l'échelle)** : (1) *in-skill step* — action ordonnée, chaque
  step finit sur un **completion criterion checkable** (contre la « premature completion ») ;
  (2) *in-skill reference* — règle consultée à la demande ; (3) *external reference* — poussée
  dans un fichier compagnon derrière un **context pointer**. La **progressive disclosure** =
  descendre l'échelle ; le test le plus propre est le **branching** : inliner ce dont toute
  branche a besoin, pousser derrière pointeur ce que seules certaines atteignent.
- **Leading words (Leitwort)** : un concept compact déjà présent dans le pré-entraînement
  (*relentless*, *tracer bullet*, *red*, *tight*, *fog of war*), répété **comme token, jamais
  paraphrasé**, ancre toute une région de comportement pour un coût minimal. Dans le corps il
  ancre l'exécution ; dans la description il ancre l'invocation. Préférer un mot pré-entraîné
  à un mot inventé.
- **Élagage** : *single source of truth* (chaque sens vit à un seul endroit) ; test du
  **no-op** phrase par phrase (« cette phrase change-t-elle le comportement par rapport au
  défaut du modèle ? » — sinon, supprimer la phrase entière) ; être agressif.
- **Grille des failure modes** : **premature completion** (affûter d'abord le completion
  criterion, découper seulement en dernier recours), **duplication**, **sediment** (couches
  périmées), **sprawl** (trop long même si tout est vivant), **no-op** (« be thorough » est un
  no-op ; le fix est un leading word plus fort — « relentless »), **negation** (piloter par
  interdiction se retourne — « don't think of an elephant » ; **prompter le positif**, ne
  garder une interdiction que comme garde-fou dur et l'associer à quoi faire à la place).

## 5. Mécanismes transverses récurrents

- **Sous-agents parallèles pour isoler les contextes** (code-review, design-it-twice,
  research en arrière-plan).
- **Human-in-the-loop structuré** : confirmation des seams, quiz de découpage, hypothèses
  classées présentées avant test, distinction stricte HITL/AFK (wayfinder : « un agent de
  grilling qui répond à ses propres questions a rompu la règle »).
- **Stop-conditions explicites** : « no red-capable command, no Phase 2 » ; « never
  `--abort` » ; « une décision par session » ; « ne PAS interviewer » (to-spec).
- **Durabilité contre l'obsolescence** : contrats de comportement plutôt que chemins/numéros
  de ligne dans tout artefact à longue durée de vie.
- **Défauts recommandés en tête** de chaque question pour que l'humain accepte d'un mot.
- **Création paresseuse** des docs ; « proceed silently » si absents.
- **Mémoire institutionnelle en fichiers versionnés**, appliquée au repo lui-même
  (dogfooding) : `.agents/adr/` (pourquoi on a *fait*) et `.out-of-scope/` (pourquoi on a
  *refusé*, avec « Prior requests » pointant les issues d'origine et les échappatoires).

## 6. Distribution (pour information — non repris)

Deux voies : **skills.sh** (`npx skills add mattpocock/skills` — copie éditable, philosophie
« fork ») et **plugin Claude Code natif** (bundle géré en lecture seule, le repo est sa propre
marketplace mono-plugin ; versions synchronisées `plugin.json`/`package.json` via Changesets +
GitHub Actions). Son ADR `.agents/adr/0002-ship-as-a-claude-code-plugin.md` documente pourquoi
le plugin Codex est différé (manifeste mono-chemin, symlinks droppés par le cache Codex).

## 7. Ce qu'on ne prend PAS (décisions du 2026-07-18)

- **Son modèle d'exécution** (spec/tickets sur issue tracker, aucune gate mécanique) — le
  pipeline gaté d'Operator est plus fort ; c'est précisément ce qui lui manque.
- **Le grilling comme skill séparé** — `op-discover` l'implémente déjà (une question à la
  fois, réponse recommandée, faits recherchés vs décisions demandées).
- **`git-guardrails-claude-code`** (hook `PreToolUse`) — Claude-only, casse notre
  agent-agnosticisme.
- **La distribution en plugin Claude Code** — notre modèle npx + adapters couvre déjà les
  5 agents ; à revisiter éventuellement, pas maintenant.
- **`teach`, `wizard`, les skills d'écriture** (`writing-beats`, etc.) — hors mission.
- **L'intégration issue tracker** (GitHub/GitLab) — l'état d'Operator vit dans
  `.operator/work/`, par conception (zéro réseau).
