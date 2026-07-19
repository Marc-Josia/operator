# Item 02 — Boucle de feedback dans `op-fix` / `operator-debugging`

- **Milestone** : M3 · **Dépendances** : item 03 (`done` d'abord — même fichiers) · **ADR** : non
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §3
  (ligne diagnosing-bugs).

## Contexte

Nos deux skills couvrent déjà bien le terrain : `op-fix` impose le repro-first (test échouant
journalisé avant tout fix, waiver operateur sinon) et `operator-debugging` a la méthode
scientifique complète (repro déterministe, bisection code/data/temps, repro minimal, hypothèses
falsifiables une variable à la fois, preuve par le test). **Ne pas réécrire ça.** Le
`diagnosing-bugs` de Matt apporte quatre affûtages précis qui nous manquent — l'item consiste à
les fusionner chirurgicalement, pas à greffer son skill entier.

## Source d'inspiration

- `skills/engineering/diagnosing-bugs/SKILL.md` — lire en entier. Les quatre mécanismes à
  prendre :
  1. **La boucle de feedback comme livrable de la phase 1** (« This is the skill ») : une liste
     *ordonnée* de ~10 moyens de construire la boucle (test échouant → curl → CLI → navigateur
     headless → replay de trace → harnais jetable → property/fuzz → bisection → différentiel →
     script HITL en dernier recours), avec un critère de complétion net : **une commande
     unique, déjà exécutée au moins une fois, capable de montrer le rouge, déterministe,
     rapide, lançable par l'agent**. Et le garde-fou : « if you catch yourself reading code to
     build a theory before this command exists, stop ».
  2. **Tag d'instrumentation greppable** : toute ligne de log jetable porte un tag unique
     (ex. `[DEBUG-a4f2]`) → le nettoyage final est un grep, pas une relecture.
  3. **« L'absence de seam est le constat »** : le test de régression s'écrit avant le fix *si
     un seam correct existe* ; sinon, l'absence de seam est elle-même le finding, et elle part
     en travail d'architecture (chez nous : un nouveau work item via op-new, jamais un
     élargissement silencieux du Scope).
  4. **Escalade honnête** : quand aucune boucle n'est constructible, le dire à l'operateur en
     listant ce qui a été tenté — plutôt que de basculer en lecture spéculative du code.
- `skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh` — pour comprendre le
  dernier recours HITL (l'agent écrit un script `step`/`capture` que l'humain exécute).
  **Optionnel chez nous** : si repris, c'est une *description* de la technique dans le skill,
  pas un script distribué (zéro fichier exécutable de plus dans le payload sans nécessité).

## Quoi construire

Dans `src/payload/skills/operator-debugging/SKILL.md` (le gros du travail — c'est le pack
d'expertise que op-fix et op-build consultent) :

1. Renforcer l'étape « Reproduce deterministically » avec la liste ordonnée des moyens de
   construire la boucle et le critère de complétion « one red-capable command, already run
   once ». Garder le vocabulaire de Matt là où il est fort (*red-capable*, *tight loop*) — ce
   sont de bons leading words (cf. item 03).
2. Ajouter le garde-fou d'arrêt : pas de commande rouge → pas d'hypothèses ; lecture de code
   pour bâtir une théorie sans boucle = stop. Plus la voie d'escalade honnête.
3. Ajouter le tag `[DEBUG-xxxx]` à la section observabilité (le xxxx choisi par l'agent,
   nettoyage par grep avant la gate de build — `diff-within-scope` attrapera les oublis, mais
   le grep est le geste propre).
4. Intégrer « no seam = the finding » : dans « What to return », ajouter un champ au bloc
   `ROOT-CAUSE FINDING` (ex. `seam: <exists | missing — file follow-up work item>`).

Dans `src/payload/skills/op-fix/SKILL.md` (retouches légères) :

5. À l'étape 3 (repro), pointer la liste des moyens de boucle du pack quand le test échouant
   n'est pas immédiat — au lieu du seul « one level down ».
6. À l'étape 8 (lesson), ajouter la question de post-mortem de Matt : « qu'est-ce qui aurait
   empêché ce bug ? » comme aiguillon pour décider si la lesson vaut `L-NNN`, une convention,
   ou un item de suivi.

## Critères d'acceptation

1. `operator-debugging` contient la liste ordonnée des moyens de boucle, le critère
   « red-capable command déjà exécutée », le garde-fou d'arrêt, le tag greppable, et le champ
   `seam:` dans le finding.
2. `op-fix` référence la liste (une phrase) et pose la question post-mortem à l'étape lesson.
3. Aucun des deux fichiers n'a grossi de plus de ~30 lignes net — c'est un affûtage, pas une
   greffe (élaguer ce que les ajouts rendent redondant).
4. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- **Ne pas** importer la présentation obligatoire des hypothèses à l'operateur avant chaque
  test (le HITL de Matt) : chez Operator, l'autonomie dans un mandat approuvé est la règle
  (constitution) ; les hypothèses s'écrivent *dans le journal*, pas dans une question bloquante.
- **Ne pas** distribuer de script shell supplémentaire sans nécessité démontrée.
- Respecter le contrat des packs : `operator-*` conseille et retourne un finding, ne touche
  jamais l'état d'un work item.
