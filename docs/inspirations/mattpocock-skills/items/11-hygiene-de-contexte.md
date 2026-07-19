# Item 11 — Hygiène de contexte (« smart zone », hand-off aux gates)

- **Milestone** : M6 · **Dépendances** : aucune (M3–M5 livrés) · **ADR** : non — pure guidance,
  aucune structure ne change (même cas que l'item 03)
- **Avant de commencer** : lire `../README.md` (contrat commun), `../reference.md` §3 (lignes
  ask-matt et handoff).

## Contexte

Chez Matt, l'hygiène de contexte est double : la « smart zone » (~120k tokens — le jugement se
dégrade quand la fenêtre se remplit ; garder grill→spec dans une fenêtre non coupée) et le skill
`handoff` (compacter une session en document de passation). Chez Operator, la moitié « reprise »
est déjà résolue **par construction** : `workitem.md` est le document de passation (frontmatter
`stage:`/`next:`, Journal append-only), `op-status` lit « depuis le disque, jamais de mémoire »,
`op-build` journalise « per task, not per session », et la prévention amont existe (tranche
« one fresh session » d'ADR-0018, une décision par session d'`op-explore`). Le gap restant :
rien ne dit à l'agent **quand s'arrêter** (préférer finir la gate en cours plutôt qu'entamer une
étape en fin de longue session) ni **quoi faire après une compaction** (relire workitem + spec
depuis le disque, ne pas faire confiance au résumé).

## Décisions actées (operateur, 2026-07-19)

1. **Constitution + écho `op-build`, rien d'autre.** Pas de nouveau skill (un `handoff` à la
   Matt dupliquerait `workitem.md`), pas de chiffre (le ~120k périme avec chaque modèle et
   aucun hôte n'expose ses tokens de façon portable).
2. **Pas de règle « un item par session ».** Écartée — pas de changement de politique de
   session, donc pas d'ADR.
3. **Le réflexe post-compaction vit dans la constitution seulement.** Le bloc toujours chargé
   est pile à son budget de 60 lignes et n'est pas touché.

## Quoi construire

1. **`src/payload/operator/constitution.md`** — un court paragraphe en fin de section
   Orchestration : le contexte est un consommable ; les frontières de gate sont les points de
   hand-off naturels (l'état sur disque y est complet, une session fraîche reprend sans perte) ;
   en fin de longue session, finir la gate en cours plutôt qu'ouvrir une étape ; **signaux
   observables** plutôt que chiffres — compaction/résumé par l'harnais, relecture de fichiers
   déjà lus, re-décision de décisions déjà journalisées — et sur signal : disk truth over
   recollection (relire `workitem.md` + la spec), hand-off à la prochaine gate.
2. **`src/payload/skills/op-build/SKILL.md`** — une à deux phrases d'écho dans le paragraphe de
   reprise de l'étape 2 (« Journal per task, not per session… »), le point d'exécution où la
   règle s'applique (règle 6 d'authoring).
3. **Manifest + tests** : `node src/lib/manifest.mjs build` puis `verify` ; `npm test` vert.

## Critères d'acceptation

1. La constitution porte la guidance, formulée sur signaux observables, sans aucun chiffre.
2. `op-build` porte l'écho au point d'exécution, sans dupliquer la politique.
3. `agents-block.md` inchangé (60 lignes) ; aucun nouveau skill ; manifest régénéré + vérifié,
   `npm test` vert.

## Garde-fous

- **Test du no-op phrase par phrase** : « be mindful of context » est un no-op — chaque phrase
  doit prescrire un geste checkable (relire tel fichier, s'arrêter à telle frontière).
- **Pas de chiffre, pas de mécanique** : aucune gate, aucun seuil de tokens ; c'est une
  discipline de lecture, comme la frontière d'ADR-0018.
- **Pas de duplication** : la constitution fait autorité ; `op-build` n'en re-dit que la partie
  qui s'exécute dans sa boucle.
