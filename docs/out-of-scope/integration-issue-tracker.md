# Intégration issue tracker (GitHub/GitLab)

Operator n'intègre pas d'issue tracker : pas de `gh`/`glab`, pas d'état de travail sur GitHub ou
GitLab.

## Pourquoi c'est hors périmètre

L'état d'Operator vit dans `.operator/work/` par conception : zéro réseau, zéro dépendance,
fichiers versionnés dans le dépôt de l'utilisateur — l'état reste lisible et vérifiable par
`op.mjs` hors ligne. Une intégration tracker réintroduirait le réseau et une dépendance
d'environnement (CLI, auth) que la constitution exclut.

## Échappatoires

`workitem.md` est la source de vérité ; l'operateur qui veut un miroir tracker peut le tenir à la
main ou l'automatiser hors toolkit.

## Demandes passées

- 2026-07-18 — analyse d'adoption `mattpocock/skills` (`reference.md` §7).
