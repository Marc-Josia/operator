# Rapport d'audit — item 03 (authoring des 13 skills)

Audit du 2026-07-19, grille `writing-great-skills` (mattpocock/skills — `SKILL.md` +
`GLOSSARY.md` lus en entier, clone du jour). Baseline pour le prochain audit.

## Passe descriptions

Objectif : une phrase-déclencheur par branche, leading word front-loadé, identité redite du
corps coupée. Résultat global : **1646 → 1059 mots (−36 %)**, dans la cible « un tiers à
moitié », sans perte de déclencheur (vérification branche par branche ci-dessous).

| Skill | Avant (mots) | Après (mots) | Δ | Principales coupes |
|---|---|---|---|---|
| op-discover | 203 | 98 | −52 % | 5 exemples de citations → 2 ; « fuzzy or open-ended » + « vague, exploratory, problem-shaped » + « thinking out loud » = 3 synonymes d'une branche → 1 ; mécanique du hand-off (redite du corps) coupée |
| op-roadmap | 174 | 92 | −47 % | l'analogie op-plan/op-roadmap dite deux fois → 0 (identité, vit dans le corps) ; chemin `.operator/projects/…` et mécanique d'approbation (corps) coupés |
| op-memory | 125 | 93 | −26 % | détail des modes compressé ; « stop doing Y » (4e synonyme de correction) coupé ; « when op-fix or op-ship needs room » (cas couvert par « at or over its cap ») coupé |
| op-status | 122 | 77 | −37 % | 6 phrasés de « where are we » → 3 ; « after a long break, a handoff, or loss of context » = même branche que « resuming earlier work » |
| operator-debugging | 142 | 94 | −34 % | énumération des anti-patterns (identité du corps) coupée ; « a crash you cannot yet trace » (synonyme) coupé |
| operator-code-review | 134 | 73 | −46 % | double énumération (checklist + tactiques IA détaillées = identité du corps) coupée |
| operator-security-review | 128 | 85 | −34 % | sous-listes d'injection (SQL, command, path, template — corps) coupées ; « never traded for speed » (constitution) coupé |
| operator-test-strategy | 119 | 87 | −27 % | « read it before writing the first test, not after » fusionné dans le déclencheur principal ; « judge whether a test is worth writing » = branche « what NOT to test » déjà nommée |
| op-new | 110 | 80 | −27 % | « survey project memory on first run » (étape du corps) coupé ; « violates iron rule 1 » (bloc/constitution) → « all development work enters here » |
| op-plan | 102 | 70 | −31 % | ordre des phrases inversé (produit d'abord) ; « right after op-new hands one off » = même branche que « sits at stage spec » |
| op-fix | 97 | 76 | −22 % | « error », « is broken », « doesn't work » (synonymes de la même branche) coupés |
| op-build | 95 | 65 | −32 % | « implement it », « write the code » (synonymes) coupés ; « never code from memory » fusionné |
| op-ship | 95 | 69 | −27 % | « finish this », « ready to merge? » (synonymes) coupés ; « never declare finished without it » → « the only path from build to done » |
| **Total** | **1646** | **1059** | **−36 %** | |

Toutes les descriptions sont désormais **quotées** en YAML (le piège `": "` ne peut plus
réapparaître par édition ultérieure).

Test de routage par description seule (« un harnais qui ne voit que la description
routerait-il encore juste ? ») : chaque ligne du tableau de routage du bloc conserve son
déclencheur — vague→op-discover, projet→op-roadmap, précis→op-new, bug→op-fix,
spec→op-plan, build→op-build, ship→op-ship, statut→op-status, règle→op-memory, et les 4
packs par domaine de conseil.

## Passe corps

Les corps étaient déjà écrits près de la grille (gates = completion criteria mécaniques ;
Failure modes = garde-fous finissant sur l'action corrective). La passe a donc surtout retiré
des redites, pas restructuré :

| Fichier | Lignes avant → après | Changement |
|---|---|---|
| op-fix | 186 → 185 | **bug de rédaction corrigé** : « the intake gate's intake gate will reject it » (phrase cassée, redondante avec la règle du scorecard) → une seule phrase |
| op-discover | 159 → 158 | no-op supprimé (justification « erodes their trust and their time » — le défaut du modèle n'interviewe déjà pas sur des faits recherchables) |
| op-roadmap | 155 → 155 | citation interne du dev (« the operator asked to "start by understanding the bricks" for a reason ») supprimée — contexte de dev fuité dans le payload |
| op-ship | 215 → 214 | triple redite du « at most three » (étape 6 + étape 9 + failure mode) → dit une fois par site, sans répétition dans la même phrase |
| op-status | 139 → 138 | duplication Purpose/Exit (« a status check must never be a step anyone hesitates to run » ≈ « reading costs nothing ») → gardé au Purpose |
| autres (8) + bloc + constitution | inchangés | voir « Vérifications sans modification » |

### Vérifications sans modification

- **Completion criteria des étapes non gatées** : op-discover (« stop when new answers stop
  changing the shape », confirmation explicite du brief), op-roadmap (approbation journalisée +
  `status: active`), op-status (« exact = the operator could hand the line to an agent
  verbatim »), op-memory (checklist d'exit à 5 cases) — tous checkables. Rien à ajouter.
- **Négations** : les interdictions restantes sont des garde-fous durs et finissent sur le geste
  de remplacement (format « Failure modes ») — conformes à la grille, conservées.
- **Bloc `agents-block.md`** (59 lignes, inchangé) : vérifié ligne à ligne comme résumé fidèle de
  la constitution — iron rules ↔ Laws/méthode, tableau de routage ↔ section Routing, System
  documents ↔ State/Memory. Aucun écart.
- **Duplication constitution ↔ skills** : la discipline ATTEMPT/postmortem et « never shotgun »
  apparaissent dans la constitution (politique) et dans op-build/op-fix (mécanique au point
  d'exécution). Conservé délibérément : la constitution énonce la loi, le skill donne le geste
  exécutable là où il s'applique — c'est le modèle ADR-0013/0016, pas du sediment. Le leading
  word partagé (*shotgun*, *postmortem*) fait le lien à coût minimal.

### Leading words canoniques du payload

Confirmés comme tokens (déjà répétés, jamais paraphrasés — désormais fixés dans `AGENTS.md`) :
**honest** (scorecard, Scope), **fresh** (review), **append-only** (journal), **mandate**
(approbation/autonomie), **escalate** (lanes), **shotgun** (anti-pattern), **harvest**
(mémoire), **grill** (discovery). Aucun mot inventé introduit.

## Règles fixées

- `AGENTS.md` § Conventions de contribution → nouvelle entrée « **Écrire un skill** » (6 règles),
  avec renvoi vers ce dossier et nota sur la divergence avec le conseil « pushy » du
  `/skill-creator` de dev (non distribué, non modifié — c'est l'outil Anthropic vendored).
- Pas d'ADR : aucune règle structurante n'a changé (l'axe `disable-model-invocation` reste
  exclu du payload sans ADR dédié, comme le brief l'exigeait).

## Critères d'acceptation — état

1. 13 descriptions passées à la grille, zéro paire de déclencheurs synonymes ✅
2. Ce rapport, métriques avant/après ✅
3. Règles dans `AGENTS.md` ; bloc à 59 lignes (≤ 60) ✅
4. Routage intact (tableau du bloc ↔ descriptions, vérifié ci-dessus ; `router.test.mjs` vert) ✅
5. Manifest régénéré + vérifié, `npm test` vert ✅ (voir le commit)
