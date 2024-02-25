# EdTransport

## Description

Le but d'EdtTransport est de synchroniser les emplois du temps universitaires avec les horaires des bus et tramways d'Angers. Les utilisateurs se connectent en utilisant leurs identifiants et mots de passe universitaires. Après avoir choisi une date, l'heure de fin des cours s'affiche. Ensuite, ils peuvent sélectionner une ligne de bus ou de tram ainsi que sa direction, et l'heure d'arrivée à l'arrêt prédéfini est affichée. Enfin, en choisissant un arrêt d'arrivée, le site présente l'heure d'arrivée finale ainsi que les correspondances, le cas échéant.

## Membres
Lou Benier: Partie front
Pierre Portron: Partie back, gestion de l'emploi du temps et front
Yohann Conanec: Partie Back, récupération des transport et des trajets


## Technologies utilisées
Pour la partie serveur du site nous utilisons node.js et express.js

Pour la récupérations des transports et des trajets nous utilisons les API d'irigo, en versions static ou temps réel dépendemment de l'heure.
Dans le cas de l'API temps rééls nous utilisons gtfs-realtime-bindings afin de pouvoir manipuler plus facilement les données en temps réél.

Pour la partie front et la partie graphique nous nous sommes servi de bootstrap

## Bugs/problèmes connus
Si il y a une correspondance le temps de calcul du trajet est très long

## Installation
/!\ node version>=20.5.0

Pour installer les dépendances :  

```npm install```

```npm i puppeteer```

```npm install -g convert-csv-to-json```

```npm install convert-csv-to-json --save```

S'assurer qu'il y a bien le répertoire C:/Users/[usrname]/.cache/puppeteer

S'il y a l'erreur suivante :
```Error: Could not find Chrome (ver. 119.0.6045.105).```

Faire :
```node node_modules/puppeteer/install.mjs```

```npm install gtfs-realtime-bindings```

```npm install adm-zip```

## Lancement du server
Pour lancer le server :  
```npm start```

## Acces au site : 
Disponible a l'adresse : http://localhost:3000
