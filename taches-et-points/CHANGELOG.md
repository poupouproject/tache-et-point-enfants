# Quêtes & Pièces

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
