TEMPO V4.3.0 — VERSION DE TEST

Déploiement : décompresser le ZIP, déposer les fichiers index.html, google-sync.js et manifest.webmanifest dans Netlify Deploys ou dans un dépôt GitHub Pages.

Avant mise à jour : sauvegarder les données Tempo au format JSON.

Nouveautés :
- Dans Paramètres > Notifications : adresse e-mail par défaut, option d'activation par défaut, URL d'un service sécurisé d'envoi.
- Dans le formulaire de tâche : choix d'envoyer ou non un e-mail à la validation et adresse modifiable par tâche.
- Une tâche cochée terminée déclenche une requête au service d'envoi uniquement si une URL HTTPS a été configurée. Sans service, aucun e-mail ne part. Le serveur doit authentifier les requêtes, valider les destinataires, protéger des abus et dédupliquer avec idempotencyKey. NE PAS y mettre une clé API.
- Synchronisation Google lancée après connexion réussie, et après création/modification d'un événement Google tant que la session est active. Aucun minuteur périodique.

LIMITATIONS IMPORTANTES :
- L'ouverture de l'application ne peut pas lancer silencieusement Google sans jeton OAuth valide : le jeton n'est conservé qu'en mémoire, il faut donc parfois reconnecter Google. La synchronisation se lance ensuite automatiquement.
- L'envoi automatique de courriel n'est PAS opérationnel sans un service serveur sécurisé configuré. GitHub Pages ne fournit pas ce service.
- Les données locales ne se synchronisent pas entre appareils par GitHub Pages.
- Google OAuth doit autoriser l'origine exacte https://<utilisateur>.github.io si GitHub Pages est utilisé ; l'application utilise une seule sélection de calendrier pour synchroniser.
- Sauvegarde JSON : les préférences de notifications sont stockées séparément dans localStorage et ne sont pas exportées.

Contrôle : syntaxe JavaScript vérifiée avec node --check. Tests réels navigateur, Google et e-mail à réaliser.
