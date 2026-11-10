# 0002. Appeler un fournisseur d'IA via une API compatible OpenAI

- Statut : acceptée
- Date : 2026-11-09
- Décideurs : équipe projet

## Contexte

L'API génère une réponse avant de l'enregistrer avec la question. Pour la
démonstration, le dépôt configure Ollama sur la machine hôte avec le modèle
`llama3.2:1b`. L'API appelle une route de chat compatible OpenAI; l'URL, le
modèle et la clé éventuelle sont configurables par variables d'environnement.

## Options

1. API compatible OpenAI, avec Ollama en local : fonctionne sans compte ni clé
   de fournisseur externe dans la configuration de démonstration. Nécessite
   Ollama, le modèle et des ressources locales.
2. API hébergée par un fournisseur : évite d'exécuter le modèle localement,
   mais nécessite un accès réseau, une clé et peut entraîner des coûts.
3. Intégration propre à chaque fournisseur : permet d'utiliser des API natives,
   mais lie le code à un fournisseur et exige des changements pour en changer.

## Décision

Nous utilisons une API de chat compatible OpenAI et Ollama en local pour la
démonstration. Les paramètres d'environnement permettent de changer de point
d'accès ou de modèle sans modifier le code de l'API.

## Conséquences

- Positives : la démonstration n'exige pas de clé ni de service IA hébergé et
  l'API reste configurable.
- Négatives, à accepter : l'équipe doit installer et lancer Ollama ainsi que le
  modèle; la qualité et la latence dépendent de la machine.
- À revoir si : les besoins de qualité, de capacité ou d'hébergement justifient
  un fournisseur distant ou une autre interface.
