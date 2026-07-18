# Item 09 — Mode « frontière » optionnel dans `op-discover`

- **Milestone** : M3 · **Dépendances** : item 03 (`done` d'abord — même fichier) · **ADR** : non
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §3
  (lignes grilling et batch-grill-me).

## Contexte

`op-discover` (`src/payload/skills/op-discover/SKILL.md`) impose « one question at a time » —
à raison comme défaut : chaque réponse façonne la question suivante, et un mur de questions
obtient des réponses superficielles. Mais pour un operateur pressé ou une session asynchrone
(il répond quand il peut), le une-par-une multiplie les allers-retours. Le `batch-grill-me`
de Matt offre le juste milieu : ne pas poser *toutes* les questions d'un coup (les dépendances
entre décisions rendraient la moitié des questions caduques), mais poser **toute la frontière**
— les décisions dont tous les prérequis sont déjà réglés — round par round.

## Source d'inspiration

- `skills/in-progress/batch-grill-me/SKILL.md` — lire en entier. Le mécanisme :
  1. Modéliser l'interview comme un **arbre de décisions** ; la **frontière** = toute décision
     dont les prérequis sont résolus.
  2. Poser la frontière entière en un round : questions **numérotées**, chacune avec sa
     **réponse recommandée** (l'operateur peut répondre « 1a, 2 oui, 3 comme tu veux » en une
     ligne).
  3. Chaque round de réponses **recalcule la frontière** ; une question dépendant d'une
     réponse encore ouverte attend le round suivant.
  4. Les faits d'environnement se recherchent sans bloquer le round (seules les questions en
     aval du fait attendent).
  5. Fini quand la frontière est vide.
- `skills/productivity/grilling/SKILL.md` — pour vérifier que le socle commun (réponse
  recommandée, faits recherchés / décisions demandées, rien avant confirmation) est déjà dans
  op-discover — il l'est ; seul le *rythme* change.

## Quoi construire

Dans `src/payload/skills/op-discover/SKILL.md`, étape 3 (l'interview) :

1. Nommer le défaut existant (une question à la fois) et ajouter le **mode frontière** comme
   variante : quand l'operateur demande d'aller vite, de « tout poser d'un coup », ou répond
   en différé, basculer en rounds de frontière — avec la définition de la frontière en une
   phrase et les règles 2–4 ci-dessus, compactes.
2. Les invariants du socle restent inconditionnels quel que soit le mode : réponse recommandée
   à chaque question, faits recherchés jamais demandés, arrêt quand le tableau se stabilise
   (étape 4), brief confirmé avant hand-off (étapes 5–6).
3. Une ligne dans la `description:` du skill pour le déclencheur (« ask me everything at
   once ») — en cohérence avec le style de description issu de l'item 03.

## Critères d'acceptation

1. op-discover décrit les deux rythmes, le critère de bascule, et la définition de frontière ;
   le une-par-une reste explicitement le défaut.
2. Les invariants du socle sont hors des deux modes (non dupliqués dans chacun).
3. Ajout net ≤ ~20 lignes.
4. Manifest régénéré + vérifié, `npm test` vert.

## Garde-fous

- Ne pas faire du mode frontière le défaut : le une-par-une produit de meilleures réponses ;
  la frontière est une concession au coût d'aller-retour, choisie par l'operateur.
- Ne pas créer un skill séparé (chez Matt c'est un skill distinct parce que son unité de
  composition est le skill ; chez nous c'est un *mode* d'op-discover — un 14e skill pour un
  rythme d'interview serait du sprawl).
- La règle « grilling past clarity is its own failure » (étape 4) s'applique aussi par round :
  une frontière qui ne rétrécit pas sur deux rounds est le signal d'arrêt.
