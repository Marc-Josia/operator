# Operator — récap d'alignement (brouillon à corriger)

## Le produit
- Un pack de skills pour Claude Code et Codex, installé dans chaque projet via `npx operator install`, mis à jour via `npx operator update`.
- Pour toi (seul pour l'instant), PM non-ingénieur.
- Objectif : du code propre, non AI-slop, maintenable sur le long terme, avec un process léger. La rigueur est portée par l'agent, pas par toi.
- 100 % nos propres skills, inspirés d'Addy Osmani et de pstack.
- Que des skills : aucune règle dans CLAUDE.md / AGENTS.md.
- Skills rédigés en anglais. L'agent, les specs, les tickets et les PR parlent la langue de l'utilisateur.
- Hors périmètre : l'orchestration (sous-agents, parallèle), l'étape du projet (proto / dev / prod), le changelog.

## Déclenchement
- Les skills se déclenchent automatiquement, sans invocation.
- Seule exception : `init-operator`, lancé à la main une fois par projet après l'installation. Il demande où vivent les specs et tickets (markdown local, GitHub, Jira, Linear…) et écrit une petite config dans le repo, lue par les autres skills.
- Chaque skill se termine en passant la main à la phase suivante.

## Le process : Idea → Spec → Code → Test → Debug → Review → Ship
Tu interviens à trois moments seulement : répondre aux questions, valider la spec, tester la feature avant de merger.

### Idea
- L'idée arrive sous n'importe quelle forme (phrase, doc, maquette).
- L'agent cherche d'abord seul dans le code, puis pose des questions produit, une ou deux à la fois, jusqu'à environ 95 % de compréhension.
- Il termine par un court récap, puis passe à la spec.

### Spec
- Brouillon toujours en markdown local, que tu corriges directement.
- Deux parties : produit pour toi (pour qui, problème, parcours, critères « c'est fini quand… », hors périmètre) et technique pour l'agent.
- Contient le découpage en plusieurs PR, chacune testable.
- Feature avec de l'UI nouvelle : prototype HTML cliquable jetable avant validation.
- Une fois validée, la spec devient sa version finale (fichier local, ou publication + tickets dans l'outil choisi ; dans ce cas, le brouillon est supprimé).

### Code
- Suit les conventions existantes, sans nouveau style. Une stack standard et éprouvée pour un nouveau projet.
- Supprimer plutôt qu'ajouter. Pas de doublon, de code mort, de solution provisoire, ni de librairie sans raison.
- Pas de commentaires inutiles : une contrainte importante devient un test ou un contrôle automatique.
- Tests écrits en même temps que le code. Fichiers petits et lisibles.
- Petit croquis de structure avant d'écrire pour les grosses features.
- Un cas non prévu par la spec : l'agent s'arrête et te demande. Les choix purement techniques, il les fait seul.

### Test
- L'agent teste d'abord lui-même comme un utilisateur (navigateur, vrai parcours, preuves à l'appui).
- Il génère par projet un « guide de vérif » de l'app (la lancer, la piloter, récolter les preuves), inspiré de pstack.
- Règles : toujours le vrai parcours utilisateur, ne jamais affaiblir un test pour qu'il passe, mieux vaut pas de test qu'un mauvais test, tester le comportement et pas l'implémentation.
- La profondeur des vérifs s'adapte à l'étape du projet, que tu indiques à l'usage. **Par défaut (si tu ne dis rien) : niveau « en dev ».** Avant une mise en prod, batterie complète, avec exploration automatique de type Bombadil pour les apps web.
- Puis toi : sur un lien de preview si possible, sinon en local, avec un guide pas à pas.

### Debug
- Se déclenche aussi pour un bug signalé hors cycle, et va jusqu'à sa propre PR.
- Boucle : reproduire (même résultat que toi ?) → corriger la vraie cause → reproduire à nouveau pour prouver la correction → ajouter un test anti-régression.
- Si le bug n'est pas reproductible, l'agent demande plus de détails au lieu de deviner.
- Après deux corrections ratées, il remet en question son hypothèse de départ.
- « Pas ce que je voulais » : petit ajustement, on met à jour la spec et on corrige ; gros changement, retour à la phase Spec.

### Review
- 100 % IA : un autre modèle si disponible, sinon le même dans un contexte vierge.
- Un problème ne compte que s'il est prouvé. L'agent vérifie aussi ce que le changement a pu casser ailleurs.
- Les problèmes trouvés sont corrigés avant la PR.

### Ship
- Plusieurs petites PR par feature, chacune testable.
- Avant la PR : tests et CI au vert, branche à jour avec main, aucun conflit. Une PR propre, prête pour la prod.
- PR en langage simple : ce qui a changé, comment tester, ce que couvrent les tests, risques restants, problèmes trouvés et corrigés en review.
- C'est toi qui merges. Ensuite, les tickets et la spec sont marqués terminés.
