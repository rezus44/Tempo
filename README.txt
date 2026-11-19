TEMPO V3 — prototype Google Agenda

1. Héberger le dossier complet sur une origine HTTPS (ex. GitHub Pages).
2. Dans Google Cloud Console, créer un projet, activer Google Calendar API,
   configurer l'écran de consentement OAuth et créer un ID client OAuth
   de type « Application Web ».
3. Ajouter l'origine exacte du site aux « Origines JavaScript autorisées ».
   Ajouter son compte Google aux utilisateurs de test si l'application est en mode test.
4. Dans Tempo, renseigner l'ID client OAuth, cliquer sur Connecter Google,
   sélectionner un calendrier modifiable et cliquer sur Synchroniser maintenant.

LIMITES IMPORTANTES
- La synchronisation V3 est manuelle et partielle : créations/modifications Tempo
  vers Google, import des événements Google sur une fenêtre de -3/+12 mois.
- Pas de suppression propagée, pas de mise à jour automatique des événements
  déjà importés après modification dans Google.
- Les modifications concurrentes détectées ne sont pas écrasées.
- Un seul compte Google connecté à la fois par session ; reconnecter pour changer.
- Ne pas utiliser pour un calendrier professionnel critique sans tests.
- Les couleurs Google sont approximées à la palette d'événements Google.
- Les photos ne sont pas envoyées à Google.
- Les données Tempo sont locales à chaque navigateur.
- La synchronisation iCloud et inter-appareils n'est pas encore disponible.
- Une réinstallation ou suppression des données du navigateur peut effacer
  les associations de synchronisation : exporter la sauvegarde JSON.
