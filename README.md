# Snake — Les 7 Tentations

Jeu autonome en HTML, CSS et JavaScript, sans dépendances ni backend.

Servir la racine du dépôt depuis une origine HTTPS (ou localhost pour le développement).
Le manifeste et le service worker permettent l'installation PWA et le mode hors ligne une fois les ressources chargées et mises en cache. Les fonctionnalités PWA nécessitent HTTPS ou localhost.

## Règles

- Une partie dure 120 secondes de jeu actif. Les pauses suspendent le temps et les pouvoirs.
- Chaque trésor rapporte 10 points transportés et agrandit le serpent d'une case.
- Le coffre de quatre cases, en haut du plateau, sécurise automatiquement tout le butin lorsqu'on le traverse. Le serpent est alors réduit à quatre cases.
- Une collision ou la fin du temps fait perdre uniquement le butin non déposé. Le score final est le total sécurisé.
- Avarice : trésors à 20 points, croissance de deux cases. Le butin accumulé ralentit le déplacement.
- Orgueil : récolter huit trésors en 25 secondes sans dépôt. Vitesse multipliée par 1,25. Bonus de 80 points à déposer. Un dépôt avant réussite interrompt le défi ; le butin est sécurisé normalement. Délai de 10 secondes avant un nouveau défi.
- Colère : brise les obstacles pendant trois secondes, mouvement plus rapide. Recharge 15 secondes depuis l'activation. Les murs et le corps restent dangereux.
- Trois difficultés. Les records et couleurs restent sur le navigateur local. Aucun classement global ni collecte de données personnelles.
- Les quatre autres tentations sont annoncées pour une future édition et ne sont pas encore jouables.

## Commandes

Sur téléphone : glisser le doigt sur le terrain ou déplacer le joystick tactile sous le terrain. Les trois pouvoirs sont accessibles à côté du joystick. L’écran principal contient seulement le terrain, le coffre, le butin, le temps et les commandes. Le menu Réglages regroupe difficulté, couleurs, son, installation et dernières parties ; son ouverture pendant une partie met le jeu en pause, sa fermeture le reprend. Les règles détaillées sont dans le bouton ?. Le contrôle ignore les doigts supplémentaires et se réinitialise au relâchement, à l'annulation du geste ou à la reprise après pause. Le terrain et le joystick bloquent le défilement pendant le geste ; le reste de la page reste défilable.

Sur ordinateur : flèches, ZQSD ou WASD. Espace lorsque le terrain a le focus : colère. P ou Échap : pause. Son facultatif. Pause automatique quand l'onglet devient invisible.

## Validation

`node --test tests/*.test.cjs` vérifie le score, le dépôt, les collisions, la pause, les tentations et la gestion des gestes tactiles. Syntaxe : `node --check app.js`, `node --check engine.js`, `node --check touch.js`, `node --check sw.js`.

Pour une mise à jour, changer le nom de cache dans `sw.js`. Fermer les fenêtres du jeu pour laisser le nouveau service worker s'activer.

## Lancer sur ordinateur

Depuis ce dossier : `python -m http.server 8000`, puis ouvrir http://localhost:8000.

## Hébergement

Les fichiers du jeu sont à la racine. Aucun framework, aucune installation et aucune compilation nécessaires. Pour GitHub Pages, publier la branche `main`, dossier `/ (root)`. Pour un hébergement statique, servir cette racine sans commande de compilation.

## Version initiale

Trois tentations sont jouables : avarice, orgueil, colère.
