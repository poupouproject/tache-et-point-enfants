# Quêtes & Pièces

Les enfants confirment eux-mêmes leurs tâches sur un écran partagé, gagnent des
pièces, et les échangent contre des récompenses ou de l'argent réel. Un parent
garde la main : il peut annuler une tâche, ajuster un solde et approuve chaque
récompense ou conversion.

## Ouvrir l'application

L'application ne s'affiche pas dans la barre latérale de Home Assistant. Le
bouton **Ouvrir l'interface web**, en haut de cette page, l'ouvre dans un
navigateur. Son adresse :

```
http://<adresse-de-home-assistant>:3000
```

## L'installer sur une tablette

L'application peut s'installer comme une vraie application, avec son icône,
et s'ouvre alors en plein écran. Les navigateurs ne le permettent toutefois que
pour une adresse sûre (HTTPS), ce que n'est pas l'adresse locale ci-dessus.

Sur une tablette Android, avec Chrome :

1. Ouvrir `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. Inscrire l'adresse de l'application (par exemple
   `http://192.168.1.10:3000`), passer le réglage à *Enabled*, puis toucher
   *Relaunch*.
3. Ouvrir l'application, puis *⋮ → Installer l'application*.

Sans installation, le bouton ⛶ en haut du tableau de bord passe en plein
écran.

## Première visite

L'application demande de choisir deux NIP de 4 à 8 chiffres :

- **NIP d'entrée** : toute la famille l'utilise pour ouvrir l'application.
- **NIP parent** : il ouvre l'espace parents (tâches, enfants, récompenses,
  pièces, réglages). Gardez-le pour vous.

Les deux doivent être différents. Ils se changent ensuite dans
**Espace parents → Réglages**.

Ajoutez ensuite les enfants dans **Espace parents → Enfants**, puis leurs tâches
et les récompenses.

## Au quotidien

- **Les tâches familiales** peuvent être faites par n'importe quel enfant : la
  première personne qui la confirme gagne les pièces, et la tâche disparaît chez
  les autres.
- **Les tâches individuelles** n'apparaissent que chez l'enfant à qui elles sont
  assignées.
- **Confirmer une tâche** crédite les pièces tout de suite. Si une tâche n'a pas
  vraiment été faite, annulez-la dans l'espace parents : les pièces sont
  retirées et la tâche redevient à faire.
- **Les récompenses et l'argent** sont débités dès la demande, puis attendent
  votre approbation sur l'accueil de l'espace parents. Un refus rembourse
  l'enfant.
- **Un enfant masqué** garde tout son historique, mais n'apparaît plus au
  tableau et ne peut plus gagner ni dépenser de pièces.

L'espace parents se referme de lui-même après 30 minutes.

## Option

| Option | Rôle |
|---|---|
| `timezone` | Fuseau horaire de la famille, par exemple `America/Montreal`. C'est lui qui décide quand une journée commence pour les tâches quotidiennes. Un nom inconnu est ignoré au profit de `America/Toronto`, avec un avertissement dans le journal. |

## Vos données

Tout est enregistré dans l'add-on lui-même, et inclus dans les **sauvegardes de
Home Assistant**. Les mises à jour conservent les enfants, les tâches et les
soldes.

L'historique des pièces ne s'efface jamais : une annulation ou un
remboursement ajoute une ligne, il ne supprime pas l'ancienne. Chaque enfant
peut ainsi voir d'où viennent ses pièces.

## Sécurité

L'application est servie sans chiffrement sur votre réseau local, et c'est le
NIP qui en protège l'accès. Ne l'exposez pas sur Internet telle quelle.

Après plusieurs NIP erronés, l'application impose une attente de plus en plus
longue avant de laisser réessayer.

Il n'existe pas de récupération de NIP oublié dans l'application : notez-les
en lieu sûr.
