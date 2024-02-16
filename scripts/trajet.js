import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import * as fs from 'fs';
import AdmZip from "adm-zip";
import path from 'path';
import * as csvToJson from "convert-csv-to-json";
import e from "express";
import { start } from "repl";
import { get } from "http";

const decalage30 = 1800000
/**json contenant les info liées aux horraires des arrêt */
const dataStopTime = await csvToJson.fieldDelimiter(',').getJsonFromCsv("donnees\\trajet_static\\stop_times.csv");
/**json contenant les infos liées aux trajets*/
const dataTrip = await csvToJson.fieldDelimiter(',').getJsonFromCsv("donnees\\trajet_static\\trips.csv");
/**json contenant les infos liées aux routes*/
const dataRoute = await csvToJson.fieldDelimiter(',').getJsonFromCsv("donnees\\trajet_static\\routes.csv");
/**json contenant les infos liées aux arret*/
const dataStops = await csvToJson.fieldDelimiter(',').getJsonFromCsv("donnees\\trajet_static\\stops.csv");
/**modèle de date pour ne comparer que les différences d'heures et pas de date,  je json fournissant datastop time ne fournissant que des heures*/
const hourstring = "2023-10-10 "




/** 
 * fonction qui retourne un dictionaire contenant l'id des transport,
 * qui passeront à l'arret a l'heure de sortie, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @param {timeSTAMP} datedepart  l'heure a laquelle l'utilisateur souhaite partir
 * @param {int} nbParligne  nombre de transport par ligne que l'on souhaite garder
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */
export async function getTransportAt(arret, datedepart, nbParligne) {
  if (nbParligne == undefined) {
    nbParligne = 1
  }
  datedepart = new Date(datedepart)
  const date = Date.now();
  const date30 = new Date(new Date(date).getTime() + decalage30)
  initTrajet()
  var transports = {};
  if (datedepart.getTime() < date30) {
    transports = await getTransportAtRT(arret, nbParligne)
  }
  else {
    transports = await getTransportAtStatic(arret, datedepart, nbParligne)
  }
  return transports
}
/** 
 * fonction qui retourne {@link dict}, un dictionaire contenant l'id des transport, actuellement en circulations, 
 * passant à l'arret, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @param {int} nbParligne  nombre de transport par ligne que l'on souhaite garder
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */

async function getTransportAtRT(arret, nbParligne) {

  /**
  * @namespace
  * @property {object}         trip                  -id du transport s'arrétant à l'arrêt
  * @property {int | string}   trip.routeId          -id de la ligne du transport
  * @property {String}      trip.arrival             -Heure de l'arrivée du transport à l'arrêt
  *
  */
  var dict = {};
  try {
    //récupère le fichier gtfs-rt
    const response = await fetch("https://ara-api.enroute.mobi/irigo/gtfs/trip-updates", {
      headers: {
        "x-api-key": "<redacted>",
        // replace with your GTFS-realtime source's auth token
        // e.g. x-api-key is the header value used for NY's MTA GTFS APIs
      },
    });
    if (!response.ok) {
      const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
      error.response = response;
      throw error;
      process.exit(1);
    }
    const buffer = await response.arrayBuffer();
    //decode le fichier gtfs-rt
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    //extrait les transport passant par l'arrêt
    var arrivalTime
    var datenow = Date.now()
    var headsign
    var id
    var info = []
    var ent
    feed.entity.forEach((entity) => {
      if (entity.tripUpdate) {
        entity.tripUpdate.stopTimeUpdate.forEach((TimeUpdate) => {
          if (TimeUpdate.stopId === arret && TimeUpdate.arrival.time.low * 1000 > datenow) {
            ent = entity
            arrivalTime = new Date(TimeUpdate.arrival.time.low * 1000).toLocaleTimeString()
            const [headsign, idLigne] = getInfoTrip(dataTrip, entity.tripUpdate.trip.tripId);
            const [route_name, route_color] = getInfoRoute(dataRoute, entity.tripUpdate.trip.routeId)
            dict[entity.tripUpdate.trip.tripId] = { routeId: entity.tripUpdate.trip.routeId, routeName: route_name, headsign: headsign, arrival: arrivalTime, color: route_color,tripId:entity.tripUpdate.trip.tripId };

          }
        })
      }
    });
    //décommenter pour exporter le fichier
    function saveJSON(data, filename) {
      fs.writeFileSync(`${filename}.json`, JSON.stringify(data));
    }
    saveJSON(ent, 'output');
    dict = extratXperLigne(dict, nbParligne)
    return dict
  }
  catch (error) {
    console.log(error);
    process.exit(1);
  }
}

/** 
 * fonction qui retourne {@link dict}, un dictionaire contenant l'id des transport, 
 * passant à l'arret, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @param {timeSTAMP} heureDepart  l'heure a laquelle on regarde les transports
 * @param {int} nbParligne  nombre de transport par ligne que l'on souhaite garder
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */
async function getTransportAtStatic(arret, heureDepart, nbParligne) {

  /**
* @namespace
* @property {object}         trip                  -id du transport s'arrétant à l'arrêt
* @property {int | string}   trip.routeId          -id de la ligne du transport
* @property {string}         trip.arrival          -heure arrivée du transport à l'arrêt
*/

  var dict = {}
  var idLigne
  var headsign


  /**temps de décalage entre le premier et dernier trajet  que l'on va considérer*/
  const décalage = 3600000;
  /**date de départ auquel on applique le modèle hourstring */
  var heuredep = new Date(hourstring + new Date(heureDepart).toLocaleTimeString("fr-FR"));
  var info = []
  /**heure de départ prévu plus décalage*/
  var heuredep1 = new Date(heuredep.getTime() + décalage)
  dataStopTime.forEach((entity) => {
    const datetrajet = new Date(hourstring + entity.arrival_time);
    if (entity.stop_id === arret && datetrajet.getTime() >= heuredep.getTime() && datetrajet.getTime() <= heuredep1.getTime()) {
      const [headsign, idLigne] = getInfoTrip(dataTrip, entity.trip_id);
      const [route_name, route_color] = getInfoRoute(dataRoute, idLigne)
      dict[entity.trip_id] = { routeId: idLigne, routeName: route_name, headsign: headsign, arrival: entity.arrival_time, color: route_color };
    }
  });
  //décommenter pour exporter le fichier
  function saveJSON(data, filename) {
    fs.writeFileSync(`${filename}.json`, JSON.stringify(data));
  }
  saveJSON(dict, 'output');
  dict = extratXperLigne(dict, nbParligne)


  return dict
}

/**
 * fonction qui retourne les informations de la ligne d'un transport
 * @param {object} data  données du fichier trips.csv
 * @param {string} idTrip  id du transport
 * @returns {array} informations de la ligne [headsign, id]
 */
function getInfoTrip(data, idTrip) {
  for (let entity of data) {
    if (entity.trip_id === idTrip) {
      return [entity.trip_headsign, entity.route_id];
    }
  }
  return "info non trouvée";
}
function getInfoRoute(data, idRoute) {
  for (let entity of data) {
    if (entity.route_id === idRoute) {
      return [entity.route_long_name, entity.route_color];
    }
  }
  return "info non trouvée";
}

/**
  * fonction qui télécharge le fichier gtfs-rt et le décompresse
 */
export async function initTrajet() {
  const url = 'https://chouette.enroute.mobi/api/v1/datas/Irigo/gtfs.zip';
  const destination = 'donnees/trajet_static';
  await downloadZipFile(url, destination);
}

/**
 * fonction qui télécharge le fichier gtfs-rt et le décompresse
 * @param {String} url  url du fichier gtfs-rt
 * @param {String} destination  nom du dossier de destination
 */
async function downloadZipFile(url, destination) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync('temp.zip', buffer);
  const zip = new AdmZip('temp.zip');
  replaceFileExtensions(zip, destination);
}

/**
* fonction qui remplace l'extension des fichiers du zip par .csv
 */
function replaceFileExtensions(zip, destinationFolder) {
  zip.getEntries().forEach((entry) => {
    const content = zip.readFile(entry);
    const newFileName = entry.entryName.replace(/\.[^/.]+$/, '.csv');
    const newPath = `${destinationFolder}/${newFileName}`;
    fs.writeFileSync(newPath, content);
  });
}

/**
 * fonction qui modifie le dictionaire pour ne guarder que X trajets par sens de ligne
 * @param {object} dictionaire contenant les informations des transports passant à l'arrêt
 * @param {int} nbtrajet nombre de trajet par sens de ligne
 * @returns {object} dictionaire contenant X trajet par sens de ligne
 */
function extratXperLigne(data, nbtrajet) {
  var lignesprésentes = new Map()
  var dict = {}

  if (!Array.isArray(data)) {
    data = Object.values(data); // Convert data to an array
  }
  // Sort data by routeId and heureArrivee
  data.sort((a, b) => {
    // Compare routeId
    if (a.routeId < b.routeId) return -1;
    if (a.routeId > b.routeId) return 1;

    // If routeId is the same, compare heureArrivee
    if (new Date(hourstring + a.arrival) < new Date(hourstring + b.arrival)) return -1;
    if (new Date(hourstring + a.arrival) > new Date(hourstring + b.arrival)) return 1;

    return 0; // They are equal
  });


  Object.keys(data).forEach((entity) => {
    if (!lignesprésentes.has(data[entity].routeId)) {
      lignesprésentes.set(data[entity].routeId, nbtrajet - 1)
      dict[entity] = data[entity]
    } else if (lignesprésentes.get(data[entity].routeId) > 0) {
      lignesprésentes.set(data[entity].routeId, lignesprésentes.get(data[entity].routeId) - 1)
      dict[entity] = data[entity]
    }
  });
  return dict
}

/**
 * Récupère les identifiants des arrêts pour un nom d'arrêt donné à partir des données fournies.
 * @param {Array} dataStops - Le tableau des données d'arrêt.
 * @param {string} nomArret - Le nom de l'arrêt à rechercher.
 * @returns {Array} - Un tableau d'identifiants d'arrêt correspondant au nom d'arrêt donné.
 */
function getStopId(dataStops, nomArret) {
  var stopIds = [];
  for (const stop of dataStops) {
    if (stop.stop_name == nomArret) {
      stopIds.push(stop.stop_id);
    }
  }
  return stopIds;
}

function getStopName(dataStops, idArret) {
  for (const stop of dataStops) {
    if (stop.stop_id == idArret) {
      return stop.stop_name;
    }
  }
}

/**
 * Récupère une des noms d'arrêts pour un ID de trajet donné.
 * @param {string} trip_id - L'ID du trajet.
 * @returns {Array<string>} - Un tableau d'identifiants d'arrêts et de leur séquence d'arrivée.
 */
function getListArretStaticWithSequence(trip_id) {
  var list_stop_id= dataStopTime.filter(entity => entity.trip_id === trip_id).map(entity => [entity.stop_id, entity.stop_sequence]);
  var list_stop_name=[]
  list_stop_id.forEach(element => {
    list_stop_name.push([getStopName(dataStops, element[0]), element[1]])
  });
  return list_stop_name;
}

/**
 * Récupère une liste d'arrêts pour un ID de trajet donné.
 * @param {string} trip_id - L'ID du trajet.
 * @returns {Array<string>} - Un tableau d'identifiants d'arrêts.
 */
function getListArretStaticName(trip_id) {
  var list_stop_id= dataStopTime.filter(entity => entity.trip_id === trip_id).map(entity => entity.stop_id);
  var list_stop_name=[]
  list_stop_id.forEach(element => {
    list_stop_name.push(getStopName(dataStops, element))
  });
  return list_stop_name;

}

/**
 * Récupère une liste d'identifiants d'arrêts pour un ID de trajet donné.
 * @param {string} trip_id - L'ID du trajet.
 * @returns {Array<string>} - Un tableau d'identifiants d'arrêts.
 */
function getListArretStatic(trip_id) {
  return dataStopTime.filter(entity => entity.trip_id === trip_id).map(entity => entity.stop_id);

}

/**
 * Vérifie si un arrêt fait partie d'un trajet.
 * @param {string} trip_id - L'identifiant du trajet.
 * @param {string} arret - L'arrêt à vérifier.
 * @returns {boolean} - True si l'arrêt fait partie du trajet, sinon False.
 */
function isArretOnTripStatic(trip_id, arret) {
  return getListArretStatic(trip_id).includes(arret);
}


/**
 * Récupère les informations de trajet pour un identifiant de trajet donné et un arrêt donné.
 * @param {string} trip_id - L'identifiant du trajet.
 * @param {string} arret - L'arrêt du trajet.
 * @returns {string} - L'heure d'arrivée du trajet.
 */
function getTrajet(trip_id, arret) {
  var arretids= getStopId(dataStops, arret)
  for (const arretId of arretids) {
    if (isArretOnTripStatic(trip_id, arretId)) {
      return getHeurearriveStaticDirecte(trip_id, arretId)
    }
  }
    return getHeurearriveStaticEscale(trip_id, arretids[0]);
  
}

export async function getTrajetInAllTrip(trip_id, nomArret) {
  const arretIds=  getStopId(dataStops, nomArret)
  var trips = []
  trips.push(getTrajet(trip_id, nomArret))
  var fastestindex = 0
  if(trips[0]!=undefined){
  var fastesthour = heureToDateTime(trips[0].arrivée.heure_arrivee)
  for(const trip of trips){
    if(heureToDateTime(trip.arrivée.heure_arrivee)<fastesthour){
      fastesthour=trip.arrivée.heure_arrivee
      fastestindex=trips.indexOf(trip)
    }
  }
  return tripLegerToTripInfo(trips[fastestindex])
}
return ("Aucun trajet trouvé")

}

function tripLegerToTripInfo(tripLeger) {
  const info_trip = getInfoTrip(dataTrip, tripLeger.premier.trip_id)
  const info_route = getInfoRoute(dataRoute, info_trip[1])
  var info_trip2;
  var info_route2;
  var changement=false;
  if(tripLeger.status.withCorrespondance){
    info_trip2 = getInfoTrip(dataTrip, tripLeger.correspondance.trip_id)
    info_route2 = getInfoRoute(dataRoute, info_trip2[1])
    if(tripLeger.correspondance.arret_id!=tripLeger.premier.arret_id){
      changement = true
    }
  }
  var tripInfo = {}
  tripInfo.status = { withCorrespondance: tripLeger.status.withCorrespondance }
  tripInfo.premier = {
    trip: { trip_id: tripLeger.premier.trip_id, trip_headsign: info_trip[0], routeId: info_trip[1], route_name: info_route[0], route_color: info_route[1] },
    arret: { arret: getStopName(dataStops, tripLeger.premier.arret_id), heure_arrivee: tripLeger.premier.heure_arrivee, arretId: tripLeger.premier.arret_id },
    changement: changement}

  if(tripLeger.status.withCorrespondance){
    tripInfo.correspondance = {
      trip: { trip_id: tripLeger.correspondance.trip_id, trip_headsign: info_trip2[0], routeId: info_trip2[1], route_name: info_route2[0], route_color: info_route2[1] },
      arret: { arret: getStopName(dataStops, tripLeger.correspondance.arret_id), heure_depart: tripLeger.correspondance.heure_départ,arretId: tripLeger.correspondance.arret_id}
    }
  }
  tripInfo.arrivée = { arret: getStopName(dataStops, tripLeger.arrivée.arret), heure_arrivee: tripLeger.arrivée.heure_arrivee }
  return tripInfo
}


/**
 * Récupère les informations sur l'heure d'arrivée d'un trajet direct. Les données sont stockées sous la forme
 * 
 * status:{withCorrespondance:bool},
 * 
 * premier:{trip_id:string},
 * 
 * arrivée:{arret:string,heure_arrivee:string}
 * @param {string} trip_id - L'identifiant du trajet.
 * @param {string} arret - L'arrêt de destination.
 * @returns {Object} - Les informations sur le trajet direct.
*/
function getHeurearriveStaticDirecte(trip_id, arret) {
  var trajetDirect = {
    status: { withCorrespondance: false },
    premier: { trip_id:trip_id, arret_id: arret, heure_arrivee: getHeureArrivee(trip_id, arret)},
    arrivée: { arret, heure_arrivee: getHeureArrivee(trip_id, arret) }
  };
  return trajetDirect;
}

/**
 * Calcule l'heure d'arrivée pour un trajet avec correspondance et une escale statique. Les données sont stockées sous la forme
 * 
 * status:{withCorrespondance:bool},
 * 
 * premier:{trip_id:string,arret_id:string,heure_arrivee:string},
 * 
 * correspondance:{trip_id:string,arret:string,heure_départ:string},
 * 
 * arrivée:{arret:string,heure_arrivee:string}
 * 
 * @param {string} trip_id - L'identifiant du trajet initial.
 * @param {string} arretfinal - L'identifiant de l'arrêt final.
 * @returns {Object} - Un objet contenant les détails du trajet léger, incluant les heures d'arrivée.
 */
function getHeurearriveStaticEscale(trip_id, arretfinal) {
  var correspondance = getTripsWithArrets(trip_id, arretfinal)
  var fastest = getFastestCorrespondance(correspondance)
  if (!fastest == undefined) {
    
  
  var leastWaitTime = getLeastWaitTime(fastest[1])
  var trajetLeger = {
    status: { withCorrespondance: true },
    premier: { trip_id, arret_id: leastWaitTime[0], heure_arrivee: leastWaitTime[1] },
    correspondance: { trip_id: fastest[0], arret_id: leastWaitTime[2], heure_départ: leastWaitTime[3] },
    arrivée: { arret: fastest[2], heure_arrivee: getHeureArrivee(fastest[0], fastest[2]) }
  };

  return trajetLeger
}
return undefined
}

/**
 * Récupère les trajets avec les arrêts communs.
 * 
 * @param {string} tripIdDepart - L'ID du trajet de départ.
 * @param {string} arretfinal - L'arrêt final.
 * @returns {Array} - Un tableau de trajets avec des arrêts communs. de la forme [tripId, [arretCommun, heureArrivee, heureDepart]]
 */
function getTripsWithArrets(tripIdDepart, arretfinal) {
  const trips = [];
  const arretsDepartName = getListArretStaticName(tripIdDepart);
  const arretsDepart = getListArretStatic(tripIdDepart);  

  for (const trip of dataTrip) {
    const tripId = trip.trip_id;
    const stopswithsequence = getListArretStaticWithSequence(tripId);
    const stopsName = getListArretStaticName(tripId);
    const stopsId = getListArretStatic(tripId);
   var stop_sequence_finale = -1


    
    if (stopsName.includes(getStopName(dataStops, arretfinal))) {
      stop_sequence_finale = getStopsequence(stopswithsequence, getStopName(dataStops, arretfinal))
    }
    
    if (stop_sequence_finale>=0  && stopsName.some(stop => arretsDepartName.includes(stop))) {

      const commonArrets = stopsName.filter(stop => arretsDepartName.includes(stop));
      var commonArrets1=convertCommonNameToId(commonArrets,arretsDepartName,arretsDepart)
      var commonArrets2=convertCommonNameToId(commonArrets,stopsName,stopsId)


      if (parseInt(stop_sequence_finale) >= parseInt(getStopsequence(stopswithsequence, getStopName(dataStops,commonArrets2[0])))) {


        const heureArriveeTrip1 = heureToDateTime(getHeureArrivee(tripIdDepart, commonArrets1[0]));
        const heureDepartTrip2 = heureToDateTime(getHeureDepart(tripId, commonArrets2[0]));

        if (heureDepartTrip2.getTime() > heureArriveeTrip1.getTime() && heureDepartTrip2.getTime() < heureArriveeTrip1.getTime() + decalage30) {
          const fin=stopsId[(stopsName.indexOf(getStopName(dataStops, arretfinal)))]
          trips.push([tripId, getCommonArretInfo(tripIdDepart, tripId,commonArrets1,commonArrets2),fin]);

        }
      }
    }
  }
    return trips;
  }



  /**
   * Retourne un tableau des arrêts communs entre deux trajets.
   *
   * @param {string} trip_id1 - L'ID du premier trajet.
   * @param {string} trip_id2 - L'ID du deuxième trajet.
   * @returns {Array} - Un tableau des arrêts communs entre les deux trajets.
   */
  function getCommonArretInfo(trip_id1,trip_id2,arrets1, arrets2) {
    var vRet = []
    for (let step = 0; step < arrets1.length; step++) {
      vRet.push([arrets1[step], getHeureArrivee(trip_id1, arrets1[step]),arrets2[step], getHeureDepart(trip_id2, arrets2[step])]);
    }
    return vRet;
    
    
    }
  

  /**
   * Récupère l'heure d'arrivée d'un trajet à un arrêt spécifique.
   * @param {string} trip_id - L'identifiant du trajet.
   * @param {string} arret - L'identifiant de l'arrêt.
   * @returns {Array<string>} - Un tableau contenant les heures d'arrivée correspondantes.
   */
  function getHeureArrivee(trip_id, arret) {

    return dataStopTime.filter(entity => entity.trip_id === trip_id && entity.stop_id === arret).map(entity => entity.arrival_time);


  }

  /**
   * Récupère l'heure de départ pour un trajet et un arrêt donnés.
   * @param {string} trip_id - L'ID du trajet.
   * @param {string} arret - L'ID de l'arrêt.
   * @returns {Array<string>} - Un tableau d'heures de départ.
   */
  function getHeureDepart(trip_id, arret) {

    return dataStopTime
      .filter(entity => entity.trip_id === trip_id && entity.stop_id === arret)
      .map(entity => entity.departure_time);
  }

  /**
   * Convertit une chaîne de caractères représentant une heure en un objet Date JavaScript.
   * @param {string} heure - La chaîne de caractères représentant l'heure.
   * @returns {Date} - L'objet Date correspondant à l'heure spécifiée.
   */

  function heureToDateTime(heure) {
    return new Date(hourstring + heure);
  }
  /**
   * Renvoie la correspondance la plus rapide parmi une liste de correspondances.
   *
   * @param {Array} correspondance - La liste des correspondances.
   * @returns {Array} La correspondance la plus rapide.
   */
  function getFastestCorrespondance(correspondance) {
    var fastest = correspondance[0]
    for (const corresp of correspondance) {
      if (heureToDateTime(corresp[1][0][3]) < heureToDateTime(fastest[1][0][3])) {
        fastest = corresp
      }
    }

    return fastest
  }
  /**
   * Retourne l'arrêt avec le temps d'attente le plus court.
   *
   * @param {Array} Arraylist - La liste des arrêts.
   * @returns {Array} L'arrêt avec le temps d'attente le plus court.
   */

  function getLeastWaitTime(Arraylist) {

    var durée = heureToDateTime(Arraylist[0][2]) - heureToDateTime(Arraylist[0][1])

    var fastest = Arraylist[0]
    for (const arret of Arraylist) {
      if (heureToDateTime(arret[2]) - heureToDateTime(arret[1]) < durée) {
        durée = heureToDateTime(arret[2]) - heureToDateTime(arret[1])
        fastest = arret
      }
    }
    return (fastest)
  }

  function getStopsequence(listarret, arret) {
    for (const a of listarret) {
      if (a[0] == arret) {
        return a[1]
      }
    }
  }
  function convertCommonNameToId(listToConvert,listArretName,listArretId){
    var listId=[]
    listToConvert.forEach(element => {
      listId.push(listArretId[listArretName.indexOf(element)])
    });
    return listId

  }

  export async function getAllArretName(){
    var arretName=[]
    dataStops.forEach(element => {
      if(!arretName.includes(element.stop_name))
      {
        arretName.push(element.stop_name)
      }
      
    });
    return arretName
  }
