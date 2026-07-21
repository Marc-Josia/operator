# ADR-0022: Un harnais d'évals sur les skills — fixtures + scénarios de pression

- Status: accepted
- Date: 2026-07-21

## Context

Le toolkit teste son *installeur* et son *vérificateur de gates* : `src/test/` couvre `init`,
`update`, `doctor`, `op.mjs` et la cohérence du routeur (95+ tests). Mais rien ne teste les
**skills eux-mêmes** — les 14 procédures et packs livrés dans `src/payload/skills/`. Or c'est là
que vit la valeur d'Operator, et là que les régressions sont les plus silencieuses :

- une `description:` qui dérive vers le vague ou recouvre un voisin dégrade le routage (le
  « second filet » de la règle d'authoring 1) sans qu'aucun test ne bronche ;
- surtout, la promesse d'Operator est *comportementale* : tenir le SOP quand l'operateur pousse à
  le sauter — « c'est un one-liner », « fais-moi confiance, les tests passent », « tant que tu y
  es, refactore tout ». C'est précisément ce qu'un modèle laissé seul rate, et rien ne mesurait
  qu'un skill donné résiste à cette pression.

`router.test.mjs` vérifie la *cohérence* du routeur (tout skill livré est routé, aucun fantôme),
mais pas le *déclenchement lexical* ni le *comportement sous pression*. Le `skill-creator` (outil
de dev, non distribué) sait éval­uer le déclenchement d'*un* skill isolé ; il ne couvre pas la
flotte entière ni les scénarios adverses.

## Decision

On ajoute un **harnais d'évals sur les skills**, dans `evals/` à la racine, en copiant l'approche
de [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) : des **fixtures** et
des **scénarios de pression**, un fichier de cas par skill (`evals/cases/<skill>.json`), trois
tiers.

- **Tier 1 (structural)** — frontmatter, contrat `op-*`/`operator-*`, `name` = dossier, piège
  YAML du `": "`, budget de mots de la description, et le plancher par skill (≥3 triggers
  positifs, ≥2 négatifs, ≥1 éval behavioral).
- **Tier 2 (routing)** — une *approximation lexicale* du routage : TF-IDF stemmé sur les
  descriptions (`evals/lib/routing.mjs`, zéro-dép). Les prompts positifs doivent ranker leur skill
  dans `top_k` ; les négatifs (avec `owner`) ne doivent pas voler un voisin ; aucune paire de
  descriptions ne doit collisionner. Gate dur : **taux rank-1** sous plancher et **collision
  ≥ 75 %**.
- **Tier 3 (behavioral)** — les scénarios de pression joués contre un agent headless sur les
  fixtures, notés contre des `expectations` observables. Opt-in (`--behavioral … --run`),
  token-based, hors CI gratuite ; en dry-run il imprime le plan.

Le harnais est de l'**outillage de dev** : il évalue le payload sans en faire partie, donc il vit
**hors de `/src`** (comme `docs/adr/` et le `skill-creator`) et n'est jamais distribué. Tiers 1–2
restent zéro-dépendance / zéro-réseau — la discipline du toolkit s'applique. `npm run eval` est le
gate ; `npm test` (le suite de l'installeur) est inchangé et continue de ne globber que
`src/test/`.

## Alternatives considered

- **Mettre les évals dans `src/test/`** pour qu'elles tournent sous `npm test`. Rejeté : ça
  distribue l'outillage de dev (violation de la frontière `/src`) et un test livré lirait
  `evals/`, qui n'est *pas* livré — `npm test` casserait chez l'utilisateur du paquet.
- **Réutiliser le système d'évals Python du `skill-creator`.** Rejeté ici : il évalue le
  déclenchement d'un skill isolé, pas la flotte ni les scénarios adverses, et il est en Python
  (le reste du dépôt est Node builtins). La demande était explicitement l'approche d'Addy.
- **Un vrai juge LLM en CI (Tier 3 automatisé et bloquant).** Rejeté comme défaut : coût en
  tokens et non-déterminisme le rendent inadapté à un gate gratuit. Il reste disponible en opt-in
  (`--run`), le transcript est persisté pour notation.
- **Faire échouer le build sur les recouvrements de négatifs.** Rejeté : le Tier 2 est une
  approximation lexicale et les skills adjacents partagent légitimement du vocabulaire
  (`op-explore` nomme `op-roadmap` ; la description d'`op-roadmap` porte « single feature or quick
  change (op-new) »). Ces recouvrements sont des **warnings** — un backlog de tuning de
  descriptions — pas des régressions bloquantes.

## Consequences

- Nouveau dossier `evals/` : `run-evals.mjs`, `lib/routing.mjs`, `routing.test.mjs`, 14
  `cases/*.json`, `fixtures/buggy-sum/`. `evals/results/` est gitignore.
- `package.json` gagne `eval` et `eval:selftest` ; `test` inchangé.
- État initial mesuré : 14 skills, 56 prompts positifs (rank-1 ≈ 93 %, plancher 80 %), 38
  scénarios behavioral. Warnings honnêtes surfacés : 5 descriptions > 90 mots, quelques prompts
  réalistes qui ratent (trous de vocabulaire) et recouvrements de voisins — le backlog de tuning.
- Toute évolution d'un skill (nouvelle ou modifiée) doit s'accompagner de son fichier de cas et
  passer `npm run eval` — consigné dans `AGENTS.md`.
- Le Tier 2 est volontairement lexical, pas sémantique : il attrape les trous de vocabulaire et
  les recouvrements grossiers pour un coût nul. Le jugement sémantique fin reste le domaine du
  Tier 3.
