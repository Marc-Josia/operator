# Distribution en plugin Claude Code

Operator ne se distribue pas comme plugin Claude Code (marketplace mono-plugin, bundle géré en
lecture seule, façon `mattpocock/skills`).

## Pourquoi c'est hors périmètre

Le modèle `npx github:MarcJosia/operator` + adapters couvre déjà les 5 agents cibles avec zéro
dépendance et zéro réseau au runtime ; un plugin ne servirait qu'un seul harnais et ajouterait
une deuxième chaîne de distribution à synchroniser (l'ADR de Matt documente d'ailleurs les
frictions côté Codex : manifeste mono-chemin, symlinks droppés).

Refus « pas maintenant, par choix structurel » mais à revisiter si l'écosystème plugin devient
multi-harnais — le rouvrir passera par la suppression de ce fichier.

## Échappatoires

`npx --yes github:MarcJosia/operator init` installe partout, y compris pour Claude Code (miroir
`.claude/skills/` posé par l'adapter `claude`).

## Demandes passées

- 2026-07-18 — analyse d'adoption `mattpocock/skills` (`reference.md` §6–7).
