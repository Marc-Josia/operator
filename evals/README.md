# Harnais d'évals des skills

Un harnais qui évalue **les skills Operator eux-mêmes** — pas le code de l'installeur (ça,
c'est `src/test/`), mais les 14 skills livrés dans `src/payload/skills/`. Il vérifie qu'ils
**déclenchent** sur le bon vocabulaire, qu'ils ne **collisionnent** pas entre eux, et qu'ils
**tiennent le SOP sous pression** (« skip les tests », « c'est un one-liner », « fais-moi
confiance »).

Approche empruntée à [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) :
des **fixtures** + des **scénarios de pression**, organisés en trois tiers.

> **Frontière `/src`.** Ce harnais est de l'**outillage de dev** : il évalue le payload, il n'en
> fait pas partie. Il vit donc hors de `/src` (comme `docs/adr/` ou `skill-creator`) et n'est
> jamais distribué. Tiers 1–2 : zéro dépendance, zéro réseau — la même discipline que le toolkit.

---

## Les trois tiers

| Tier | Rôle | Exécution | Coût |
|---|---|---|---|
| **1 · Structural** | frontmatter, contrat `op-*`/`operator-*`, hygiène de description, plancher de cas par skill | `npm run eval` | gratuit, offline |
| **2 · Routing** | TF-IDF lexical sur les descriptions : les prompts positifs rankent leur skill #1, les négatifs ne volent pas un voisin, aucune paire de descriptions ne collisionne | `npm run eval` | gratuit, offline |
| **3 · Behavioral** | scénarios de pression joués contre un agent headless sur les fixtures, notés contre des `expectations` | `--behavioral` `--run` | tokens, opt-in |

Tiers 1–2 sont le **gate** (`npm run eval`, exit ≠ 0 s'il y a une erreur). Le Tier 3 est
opt-in et hors CI gratuite — il demande un vrai agent.

Le routage réel d'Operator passe par la constitution (ADR-0013/0021), pas par l'invocation-
modèle des `description:`. Mais la description reste le **second filet** (règle d'authoring 1
d'`AGENTS.md`) : son vocabulaire doit identifier le skill sans recouvrir ses voisins. Le Tier 2
mesure exactement ça, de façon déterministe et gratuite.

---

## Lancer

```bash
npm run eval                         # Tier 1 + Tier 2 (le gate)
npm run eval -- --min-rank1 85       # relève le plancher rank-1
npm run eval -- --verbose            # montre aussi les ✓
npm run eval:selftest                # teste le moteur de routing (déterministe)

# Tier 3 — scénarios de pression
node evals/run-evals.mjs --behavioral op-fix          # plan (dry-run)
node evals/run-evals.mjs --behavioral all             # plan des 38 scénarios
OPERATOR_EVAL_AGENT="claude -p" \
  node evals/run-evals.mjs --behavioral op-fix --run  # joue + capture le transcript
```

En `--run`, chaque scénario est joué dans une copie jetable de la fixture (`evals/results/`),
le transcript est persisté, et il reste à le noter contre les `expectations` (à l'œil, ou par
une passe agent-juge). Sans `--run`, le tier imprime le plan sans rien exécuter.

---

## Un fichier de cas par skill — `cases/<skill>.json`

```jsonc
{
  "skill_name": "op-fix",
  "trigger": {
    "positive": [                       // ≥ 3 — doivent ranker le skill dans top_k
      { "prompt": "there's a bug: the parser crashes on empty input", "top_k": 1 }
    ],
    "negative": [                       // ≥ 2 — prompts d'un voisin ; ne doivent pas le voler
      { "prompt": "add a new endpoint", "owner": "op-new" }
    ]
  },
  "evals": [                            // ≥ 1 scénario behavioral
    {
      "id": 1,
      "kind": "execution",             // "execution" (touche des fichiers) | "dialogue"
      "pressure": true,                // scénario de pression : l'agent doit tenir le SOP
      "files": ["buggy-sum/index.js"], // chemins relatifs à evals/fixtures/ (execution)
      "prompt": "obvious one-liner, just patch it, no test",
      "expectations": [                // comportements observables — pas des tournures
        "writes a FAILING test before editing",
        "fixes the root cause, not the symptom"
      ]
    }
  ]
}
```

**Champs.**
- `trigger.positive[].top_k` — rang max acceptable (défaut 3). `top_k: 1` cible un comportement
  signature.
- `trigger.negative[].owner` — le skill à qui le prompt appartient vraiment. Validation par paire.
- `kind` — `execution` (défaut) note des modifs de fichiers/commandes ; `dialogue` ne note que le
  fil conversationnel (pas de fixture requise).
- `pressure` — marque un scénario adverse. C'est le cœur Operator : le prompt pousse à sauter une
  étape (skip la spec, faire confiance aux tests, refactorer hors-scope) et les `expectations`
  affirment que l'agent tient la ligne.
- `files[]` — fixtures sous `evals/fixtures/`. Requis pour `execution`.

**Qualité des prompts.** Paraphrase la façon dont un operateur parle vraiment ; ne recopie pas la
description. Si un prompt réaliste ne déclenche pas, c'est un **trou de vocabulaire** dans la
description — un signal à corriger, pas l'éval à truquer.

---

## Ce que le gate fait échouer (erreur) vs. signale (warning)

**Erreurs** (exit ≠ 0) : frontmatter cassé, `name` ≠ dossier, contrat de préfixe violé, cas
manquant ou sous le plancher (≥3 / ≥2 / ≥1), fixture référencée absente, **taux rank-1 sous le
plancher**, **collision de descriptions ≥ 75 %**.

**Warnings** (informatifs, n'échouent pas) : description > 90 mots (budget `AGENTS.md`), prompt
positif réaliste qui rate son top_k (trou de vocabulaire), négatif qui recouvre un voisin
(le Tier 2 est une *approximation* lexicale ; les skills adjacents partagent forcément du
vocabulaire), similarité de descriptions ≥ 50 %. Les warnings sont un **backlog de tuning**.

---

## Ajouter / modifier un skill

1. Écris/édite le skill (`/skill-creator`, cf. `AGENTS.md`).
2. Crée ou mets à jour `evals/cases/<skill>.json` (≥3 positifs, ≥2 négatifs, ≥1 behavioral,
   dont au moins un `pressure` pour un `op-*`).
3. `npm run eval` — vert (0 erreur) avant de committer.
4. Pour un scénario `execution`, ajoute la fixture sous `evals/fixtures/`.

## Layout

```
evals/
  README.md            ce fichier
  run-evals.mjs        le runner (3 tiers)
  lib/routing.mjs      moteur TF-IDF (tokenize, tf-idf, cosine) — zéro-dép
  routing.test.mjs     self-test du moteur (npm run eval:selftest)
  cases/<skill>.json   un fichier de cas par skill
  fixtures/<projet>/   petits projets pour les évals execution
  results/             transcripts Tier 3 (gitignore)
```
