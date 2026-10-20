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
**Espace parents → Réglages**, ou dans la configuration de l'application dans
Home Assistant (voir *Les NIP dans Home Assistant*).

Ajoutez ensuite les enfants dans **Espace parents → Enfants**, puis leurs tâches
et les récompenses.

## Au quotidien

- **Les tâches familiales** peuvent être faites par n'importe quel enfant : la
  première personne qui la confirme gagne les pièces, et la tâche disparaît chez
  les autres.
- **Les tâches individuelles** n'apparaissent que chez l'enfant à qui elles sont
  assignées.
- **Les tâches « chaque enfant »** (faire son lit, brosser ses dents)
  apparaissent chez tous les enfants : chacun fait la sienne et gagne ses
  pièces. Une seule tâche à créer et à modifier pour toute la fratrie.
- **Confirmer une tâche** crédite les pièces tout de suite. Si une tâche n'a pas
  vraiment été faite, annulez-la dans l'espace parents : les pièces sont
  retirées et la tâche redevient à faire.
- **Les récompenses et l'argent** sont débités dès la demande, puis attendent
  votre approbation sur l'accueil de l'espace parents. Un refus rembourse
  l'enfant.
- **Un enfant masqué** garde tout son historique, mais n'apparaît plus au
  tableau et ne peut plus gagner ni dépenser de pièces.

L'espace parents se referme de lui-même après 30 minutes.

## Options

Dans l'onglet **Configuration** de cette page. Les deux NIP sont sous
*Afficher les options de configuration facultatives inutilisées*.

| Option | Rôle |
|---|---|
| **Fuseau horaire** | Fuseau de la famille, par exemple `America/Montreal`. C'est lui qui décide quand une journée commence pour les tâches quotidiennes. Un nom inconnu est ignoré au profit de `America/Toronto`, avec un avertissement dans le journal. |
| **NIP d'entrée** | Facultatif. Rempli, il remplace le NIP d'entrée de l'application. |
| **NIP parent** | Facultatif. Rempli, il remplace le NIP de l'espace parents. Il doit être différent du NIP d'entrée, sinon il est ignoré. |

## Les NIP dans Home Assistant

Par défaut, les NIP se choisissent et se changent dans l'application. Vous
pouvez aussi les fixer dans la configuration de l'application dans Home
Assistant :

- **Option remplie** : c'est elle qui fait foi. Dans l'application, le champ du
  NIP affiche « Géré dans Home Assistant » et ne peut plus être changé.
- **Option vide** : le NIP se gère dans l'application, comme d'habitude.

Après avoir modifié une option, **redémarrez l'application** (bouton
*Redémarrer* de l'onglet Info). Le journal indique alors « NIP parent géré par
Home Assistant », sans jamais afficher le NIP lui-même. Une option mal remplie
(moins de 4 chiffres, des lettres, ou un NIP parent identique au NIP d'entrée)
est ignorée, avec un avertissement dans le journal.

### J'ai oublié un NIP

1. Onglet **Configuration** : remplissez l'option du NIP oublié avec un
   nouveau NIP, puis **Enregistrer**.
2. Onglet **Info** : **Redémarrer**.
3. Entrez dans l'application avec le nouveau NIP.

Vous pouvez en rester là, ou rendre la main à l'application : videz l'option et
redémarrez. Le NIP reste celui que vous venez de choisir, puisque l'application
l'a enregistré à votre première entrée ; il se change de nouveau dans
**Réglages**.

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

Un NIP oublié se récupère depuis Home Assistant (voir *J'ai oublié un NIP*).

Les NIP fixés dans Home Assistant y sont conservés en clair : ils figurent dans
la configuration et dans les sauvegardes de Home Assistant. Dans l'application,
ils ne sont jamais enregistrés en clair.
