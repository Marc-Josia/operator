# Garde-fous git par hooks Claude-only

Operator ne reprend pas `git-guardrails-claude-code` (hook `PreToolUse` de Claude Code) ni aucun
mécanisme fondé sur les hooks d'un harnais particulier.

## Pourquoi c'est hors périmètre

Le toolkit est agent-agnostique par contrainte non négociable : tout doit fonctionner sur Claude
Code, Codex, OpenCode, Cursor et Gemini. Un hook `PreToolUse` n'existe que chez Claude ; en
dépendre casserait la garantie pour les quatre autres harnais.

## Échappatoires

Les garde-fous d'Operator sont dans le dépôt, pas dans le harnais : gates mesurées par
`.operator/bin/op.mjs` (diff réel, caps de lane, chemins protégés), constitution toujours chargée.

## Demandes passées

- 2026-07-18 — analyse d'adoption `mattpocock/skills` (`reference.md` §7).
