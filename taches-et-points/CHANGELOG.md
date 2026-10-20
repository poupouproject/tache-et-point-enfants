# Quêtes & Pièces

## 1.5.1

- La boutique d'un enfant peut maintenant être fermée « jusqu'à la fin de la
  journée » (jusqu'à minuit), et c'est le choix proposé d'office. La tablette
  affiche d'elle-même ce qui change depuis un autre appareil, comme une boutique
  fermée, en moins d'une demi-minute et sans recharger la page ; rien ne bouge
  pendant qu'un enfant a une fenêtre ouverte.

## 1.5.0

- Un parent peut fermer la boutique d'un enfant pour un temps (de 30 minutes à
  une semaine), avec une raison : l'enfant voit sur sa carte jusqu'à quand et
  pourquoi, et ne peut plus demander de récompense ni d'argent, mais il peut
  toujours gagner des pièces. La boutique rouvre d'elle-même à l'heure prévue.
  Dans Home Assistant, « Pièces de Arnaud » devient « Pièces d'Arnaud ».

## 1.4.0

- L'application parle maintenant à Home Assistant : les pièces de chaque enfant,
  ses tâches à faire, les tâches au choix et les demandes en attente y
  apparaissent comme capteurs, et chaque demande, décision ou tâche faite y
  déclenche un événement. Avec le blueprint fourni, une demande de récompense ou
  d'argent arrive en notification sur le téléphone, avec « Approuver » et
  « Refuser ».

## 1.3.0

- L'accueil de l'espace parents a une section « Activité » : les tâches faites
  et les récompenses demandées des deux dernières semaines, regroupées par jour
  (les jours passés se replient) et filtrables par enfant. Annuler une tâche
  demande maintenant une confirmation, pour ne plus retirer de pièces par
  accident.
- Les NIP peuvent maintenant être fixés dans la configuration de l'application
  dans Home Assistant : c'est la façon de récupérer un NIP oublié. Laissés vides,
  ils se gèrent dans l'application comme avant.

## 1.2.1

- Une tablette restée ouverte pendant une mise à jour se recharge maintenant
  d'elle-même avec la nouvelle version. Confirmer une tâche ne mène plus à une
  page d'erreur : au pire, un message « mise à jour, un instant… » s'affiche et
  la page se recharge, sans rien perdre.

## 1.2.0

- Une tâche peut maintenant être « pour chaque enfant » : créée une seule fois,
  elle apparaît chez tous les enfants et chacun gagne ses pièces en la faisant.
  Sur téléphone, l'espace parents a une barre d'onglets en bas de l'écran, les
  titres des tâches et des récompenses se lisent en entier, et la liste des
  tâches se filtre par enfant ou par tâches familiales. Les récompenses se
  modifient maintenant après coup (nom, prix, icône).

## 1.1.0

- Le tableau de bord tient maintenant sur l'écran d'une tablette, sans défiler :
  chaque enfant a une carte avec son solde, le nombre de tâches qui lui restent,
  et trois boutons. « J'ai fait une tâche » ouvre la liste des tâches, et chaque
  tâche confirmée déclenche un « Bravo ! » et envoie les pièces vers le solde.
  « Dépenser » et « Historique » s'ouvrent aussi dans une fenêtre, et le haut du
  tableau indique combien de tâches au choix restent pour la famille. En touchant
  son avatar, un enfant choisit lui-même son avatar et sa couleur. L'application
  peut s'installer sur une tablette et s'ouvrir en plein écran, et la page de
  l'application dans Home Assistant a maintenant un bouton « Ouvrir l'interface
  web ».

## 1.0.2

- L'application a maintenant son icône et son logo dans Home Assistant, ainsi
  qu'un onglet Documentation qui explique comment l'ouvrir, choisir les NIP et
  gérer les tâches. L'option « log_level », qui n'avait aucun effet, disparaît,
  et le journal de l'application n'affiche plus d'avertissements inutiles au
  démarrage.

## 1.0.1

- Un double clic sur « Refuser » ou « Annuler » ne rembourse ni ne retire plus les
  points deux fois, changer la fréquence d'une tâche ne la fait plus payer deux
  fois ni ne casse la série en cours, un enfant désactivé ne peut plus gagner ni
  dépenser de pièces, et un fuseau horaire mal écrit dans les options n'empêche
  plus l'application de s'ouvrir.
- Chaque version de l'add-on publie maintenant son journal des changements, visible
  depuis la page de l'add-on dans Home Assistant: on voit ce qui change avant de
  mettre à jour.
- Les noms des tâches et des récompenses s'affichent en entier, sur deux lignes au
  besoin, au lieu d'être coupés sur les petits écrans.

## 1.0.0

Première version.

- Tableau de bord familial: une carte par enfant, avec son solde de pièces, sa
  série de jours consécutifs et ses quêtes du jour.
- Tâches familiales (la première personne qui la fait gagne les pièces) et
  tâches individuelles, avec récurrences quotidienne, hebdomadaire, certains
  jours de la semaine, ou une seule fois.
- Confirmation en un tap: les pièces sont créditées tout de suite, un parent
  peut annuler après coup.
- Boutique de récompenses et conversion des pièces en argent réel, les deux
  soumises à l'approbation d'un parent.
- Espace parents protégé par un NIP distinct: tâches, enfants, récompenses,
  ajustements manuels et réglages.
