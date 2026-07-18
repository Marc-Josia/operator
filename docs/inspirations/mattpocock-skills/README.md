# Inspirations — `mattpocock/skills`

Ce dossier organise l'adoption sélective d'idées du repo
[`mattpocock/skills`](https://github.com/mattpocock/skills) (« Skills For Real Engineers »,
Matt Pocock / aihero.dev) dans le toolkit Operator. L'analyse source a été menée le 2026-07-18
sur l'état du repo au commit du 2026-07-16.

## Comment utiliser ce dossier (si tu es un agent chargé d'un item)

1. **Lis `reference.md`** — la synthèse du repo de Matt : son architecture, ses mécanismes,
   sa théorie d'écriture des skills. C'est le contexte partagé de tous les items ; ne pars
   pas re-explorer son repo avant de l'avoir lue.
2. **Lis le brief de ton item** dans `items/NN-slug.md`. Il est autonome : contexte, quoi
   construire, fichiers sources chez Matt à lire en profondeur, fichiers à toucher chez nous,
   critères d'acceptation, garde-fous.
3. **Clone le repo source** quand ton brief te renvoie à des fichiers précis :

   ```bash
   git clone --depth 1 https://github.com/mattpocock/skills /tmp/mattpocock-skills
   ```

   Les chemins cités dans les briefs sont relatifs à la racine de ce clone. Le repo évolue :
   si un fichier cité a bougé, cherche-le par nom (`SKILL.md` du skill nommé) plutôt que
   d'abandonner.
4. **Consulte `roadmap.md`** pour vérifier les dépendances de ton item et mettre à jour son
   statut quand tu livres.

## Contrat commun à tous les items

Ces règles s'appliquent à chaque item, en plus de son brief (source de vérité :
`AGENTS.md` à la racine — le relire avant de commencer) :

- **On s'inspire, on ne copie pas.** Matt écrit pour un modèle skills-composables sans état
  gaté ; Operator a un pipeline d'état avec gates vérifiées mécaniquement. Chaque idée doit
  être *traduite* dans notre modèle (work items, lanes, gates, mémoire plafonnée), jamais
  transplantée telle quelle. Le brief de chaque item dit précisément quoi prendre et quoi
  laisser.
- **Frontière `/src`** : tout ce qui est distribué vit dans `/src`, **en anglais**. Les docs
  de ce dossier restent en français et ne partent jamais dans la distribution.
- **Créer ou modifier un skill** → via `/skill-creator`, sous `src/payload/skills/<name>/SKILL.md`.
  Attention au piège YAML `": "` dans une `description:` non quotée.
- **Après toute modif sous `src/payload/`** → `node src/lib/manifest.mjs build` puis
  `node src/lib/manifest.mjs verify`.
- **Avant de conclure** → `npm test` (la suite complète). Toute nouvelle behavior de
  `src/lib`/`op.mjs` mérite un test.
- **`src/payload/agents-block.md` reste ≤ 60 lignes.**
- **Décision d'architecture significative** → nouvel ADR dans `docs/adr/` (ne jamais réécrire
  un ADR accepté). Les briefs signalent quand un ADR est attendu.
- **Zéro dépendance runtime, jamais de réseau** dans le toolkit ; Node builtins uniquement.
- **Agent-agnostique** : toute évolution doit fonctionner sur Claude Code, Codex, OpenCode,
  Cursor et Gemini. C'est notamment pour cela qu'on ne reprend ni ses hooks Claude-only ni
  son plugin Claude Code (voir « Ce qu'on ne prend pas » dans `reference.md`).

## Contenu

- `reference.md` — la documentation de référence sur le repo de Matt.
- `roadmap.md` — les milestones, l'ordre, les dépendances, le statut.
- `items/` — un brief autonome par implémentation.
