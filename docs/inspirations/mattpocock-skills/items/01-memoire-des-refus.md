# Item 01 — Mémoire des refus (`out-of-scope`)

- **Milestone** : M1 · **Dépendances** : aucune · **ADR** : oui (nouveau `docs/adr/0017+`)
- **Avant de commencer** : lire `../README.md` (contrat commun) et `../reference.md` §5.

## Contexte

Operator mémorise ce qui a été *fait* (`lessons.md`, `conventions.md`, ADRs dans
`.operator/memory/decisions/`) mais rien ne capture ce qui a été *refusé*. Conséquence : un
operateur ou un agent peut re-proposer indéfiniment une idée déjà écartée, et chaque fois la
discussion repart de zéro. Chez Matt, `.out-of-scope/<concept>.md` résout exactement ça : un
fichier par concept rejeté, avec le motif, les échappatoires existantes, et les demandes
passées qui l'ont motivé ; son skill `triage` fait un **prior rejection check** contre ce
dossier avant toute discussion.

## Source d'inspiration (dans le clone de `mattpocock/skills`)

- `skills/engineering/triage/OUT-OF-SCOPE.md` — le mécanisme complet : un fichier par
  **concept** (pas par demande) ; correspondance par **similarité de concept**, pas par
  mot-clé ; règle critique — n'écrire que pour un *rejet* délibéré, **jamais** pour un
  « déjà implémenté » (sinon la déduplication s'empoisonne : on refuserait des demandes
  légitimes de comportement existant).
- `.out-of-scope/*.md` à la racine de son repo — trois exemples réels du format (sections
  *Why this is out of scope*, échappatoires, *Prior requests* avec liens).
- `skills/engineering/triage/SKILL.md` — où le check s'insère dans le flux (étape « Gather
  context », avant de recommander quoi que ce soit).

## Quoi construire

1. **ADR** : décider et documenter l'emplacement (`.operator/memory/out-of-scope/`, un fichier
   par concept + un `README.md` de contrat, hors caps de lignes — c'est un dossier, pas un
   fichier plafonné ; décider s'il faut un cap sur le *nombre* de fichiers ou si `archive/`
   suffit), qui écrit (op-new au triage rejeté, op-discover quand l'operateur écarte une piste,
   op-roadmap pour la section Out of scope d'un projet ?), et qui lit.
2. **Payload** (`src/payload/`, en anglais) :
   - Seed du dossier + `README.md` de format posé par `init` (voir comment
     `src/payload/operator/` structure `memory/` aujourd'hui, et `src/lib/` pour ce que
     `init`/`update`/`doctor` créent et vérifient).
   - `op-discover` : au « grounding » (étape 1), consulter `out-of-scope/` ; si la demande
     recoupe un concept rejeté, le dire à l'operateur avec le motif — c'est lui qui décide de
     rouvrir (le refus n'est pas un veto éternel, c'est une mémoire).
   - `op-new` : même check au triage, avant le scorecard.
   - `op-memory` : ajouter la ligne correspondante au tableau « Write triggers » et un
     paragraphe de format dans le mode record (rejet = concept + motif + citation de la
     demande d'origine ; jamais de « déjà implémenté »).
3. **Environnement de dev (dogfooding)** : créer `docs/out-of-scope/` à la racine du repo
   Operator avec un README court, et y consigner les refus déjà actés le 2026-07-18 (voir
   `../reference.md` §7 : plugin Claude Code, hooks git Claude-only, intégration issue
   tracker, etc.). En français, hors distribution.
4. **Tests** : ce que `init` pose et ce que `doctor` vérifie mérite un test dans `src/test/`.

## Critères d'acceptation

1. `init` sur un projet vierge crée `.operator/memory/out-of-scope/README.md` ; `update` ne
   touche jamais les fichiers de refus existants (même contrat que `memory/`).
2. `op-discover` et `op-new` contiennent chacun une étape explicite de prior-rejection check
   avec le comportement « signaler, motif à l'appui, l'operateur tranche ».
3. Le format interdit explicitement les entrées « déjà implémenté ».
4. L'ADR est écrit, le manifest régénéré, `npm test` vert, `docs/out-of-scope/` existe et
   contient les refus du 2026-07-18.

## Garde-fous

- Ne pas transformer le check en veto automatique : l'agent **signale**, l'operateur décide.
- Ne pas fusionner avec `lessons.md` ni `decisions/` — les ADRs disent pourquoi on a *fait*,
  ce dossier dit pourquoi on a *refusé* ; les mélanger noie les deux.
- Rester dans le budget de lignes d'`agents-block.md` (≤ 60) : si le bloc doit mentionner le
  check, une demi-ligne maximum, le détail vit dans les skills et la constitution.
