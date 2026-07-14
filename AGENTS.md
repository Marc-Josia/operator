# AGENTS.md

## Mission

Ce document définit les règles à suivre pour les agents qui contribuent au développement du toolkit **Operator**.

L'objectif est de préserver une séparation claire entre le toolkit lui-même et les outils utilisés pour le développer, tout en garantissant une cohérence dans les contributions.

---

# À propos d'Operator

## Vision

**Operator** est un toolkit de développement assisté par l'IA.

Sa mission est de permettre à des agents de développement d'adopter systématiquement les méthodes de travail d'un ingénieur logiciel expérimenté, afin d'améliorer la qualité, la fiabilité et la maintenabilité du code produit.

## Le problème

Les modèles d'IA sont aujourd'hui capables de produire du code de qualité.

Cependant, leurs performances dépendent fortement de la manière dont ils sont utilisés :

* un développeur expérimenté sait guider un agent avec une méthodologie rigoureuse ;
* un utilisateur novice obtient souvent des résultats plus aléatoires.

Cette différence correspond au fossé entre le **vibe coding** et l'**agentic engineering**.

## Objectif

Operator a pour objectif de réduire cet écart en imposant aux agents un workflow inspiré des bonnes pratiques d'un **Senior Software Engineer**.

Le toolkit prend le partie pris d'être un "employé" de l'humain qui est un operateur. L'humain dirige, le toolkit éxécute en suivant un SOP. 

Le toolkit doit guider les agents afin qu'ils appliquent systématiquement une méthodologie structurée plutôt que de produire du code de manière opportuniste.

---

# Structure du projet

## Répertoire du toolkit

L'ensemble du toolkit est contenu dans le répertoire :

```text
/src
```

Tout ce qui se trouve dans ce dossier fait partie intégrante d'Operator.

## Séparation des responsabilités

Tous les fichiers situés **en dehors de `/src`** constituent l'environnement de développement du toolkit (scripts, outils, compétences, instructions, documentation, etc.).

Les agents doivent respecter les règles suivantes :

* considérer `/src` comme la seule source du toolkit ;
* ne jamais intégrer au toolkit des outils, compétences (*skills*) ou instructions provenant de leur propre environnement de développement ;
* maintenir une séparation stricte entre les ressources servant à construire Operator et les ressources distribuées avec Operator.

Cette séparation est essentielle pour garantir que le toolkit reste autonome, portable et indépendant de l'environnement utilisé pour le développer.

## Comportement :

- Toujours écrire tous les fichiers du toolkit en anglais. 
- Toujours utiliser le skill /skill-creator pour la création de skills
- Le toolkit doit être Agents agnostique c'est à dire fonctionner sur Claude Code, Codex, Opencode etc
- Le toolkit doit pouvoir être installé via "npx githbub marc-jsoa/operator" ou une commande dans le même style. 