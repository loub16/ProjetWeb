import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import * as fs from 'fs';
import AdmZip from "adm-zip";
import path from 'path';
import * as csvToJson from "convert-csv-to-json";
import e from "express";
import { start } from "repl";

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
    console.log("RT")

    transports = await getTransportAtRT(arret, nbParligne)
  }
  else {
    console.log("static")
    transports = await getTransportAtStatic(arret, datedepart, nbParligne)
  }
  console.log("transports", transports)
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
            dict[entity.tripUpdate.trip.tripId] = { routeId: entity.tripUpdate.trip.routeId, routeName: route_name, headsign: headsign, arrival: arrivalTime, color: route_color };

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
  console.log("init")
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
  console.log("nb trajet:", nbtrajet)
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
function getArret(dataStops, nomArret) {
  const stopIds = [];
  for (const stop of dataStops) {
    if (stop.stop_name === nomArret) {
      stopIds.push(stop.stop_id);
    }
  }
  return stopIds;
}

function getTrajet(trajets, destinations) {


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
 * Récupère l'heure d'arrivée d'un arrêt sur un trajet.
 * @param {string} trip_id - L'identifiant du trajet.
 * @param {string} arret - L'arrêt.
 * @returns {string} - L'heure d'arrivée de l'arrêt sur le trajet.
 */
function getHeurearriveStaticDirecte(trip_id, arret) {
  if (!isArretOnTripStatic(trip_id, arret)) {
    return null;
  }
  const entity = dataStopTime.find(entity => entity.trip_id === trip_id && entity.stop_id === arret);
  return entity.arrival_time;
}
function getHeurearriveStatic(trip_id, arret) {
  if (isArretOnTripStatic(trip_id, arret)) {
    return getHeurearriveStaticDirecte(trip_id, arret);
  }
}
function getArretWithEscale(trip_id, arretfinal) {
  const arrets = getListArretStatic(trip_id);
  const routes = [];

  for (const route of dataRoute) {
    if (route.route_id !== trip_id) {
      const routeArrets = getListArretStatic(route.route_id);
      if (routeArrets.includes(arretfinal)) {
        for (const arret of arrets) {
          if (routeArrets.includes(arret)) {
            routes.push(route.route_id);
            break;
          }
        }
      }
    }
  }
  return routes;
}


/**
 * Récupère les trajets avec les arrêts communs.
 * 
 * @param {string} tripIdDepart - L'ID du trajet de départ.
 * @param {string} arretfinal - L'arrêt final.
 * @returns {Array} - Un tableau de trajets avec des arrêts communs. de la forme [tripId, [arretCommun, heureArrivee, heureDepart]]
 */
function getTripsWithArrets(tripIdDepart, arretfinal) {
  const start = new Date();
  const trips = [];
  const arretsDepart = getListArretStatic(tripIdDepart);
  const arretsFinal = getListArretStatic(arretfinal);

  for (const trip of dataTrip) {
    const tripId = trip.trip_id;
    const stops = getListArretStatic(tripId);

    if (stops.includes(arretfinal) && stops.some(stop => arretsDepart.includes(stop))) {
      const commonArrets = stops.filter(stop => arretsDepart.includes(stop));
      const heureArriveeTrip1 = heureToDateTime(getHeureArrivee(tripIdDepart, commonArrets[0]));
      const heureDepartTrip2 = heureToDateTime(getHeureDepart(tripId, commonArrets[0]));
      for (const arret of commonArrets) {
        
        

        if (heureDepartTrip2.getTime() > heureArriveeTrip1.getTime() && heureDepartTrip2.getTime() < heureArriveeTrip1.getTime() + decalage30) {
                    trips.push([tripId, getCommonArret(tripIdDepart, tripId)]);
          break; // Exit the loop when a trip is found
        }
      }
    }
  }
  const end = new Date() - start;
  console.log(end);
  return trips;
}
var correspondance=(getTripsWithArrets("5369904", "SOLELEVA"))
console.log(correspondance)
console.log("fastest")
var fastest=getFastestCorrespondance(correspondance)
console.log(fastest)
console.log("least wait time")
var leastWaitTime=getLeastWaitTime(fastest[1])
console.log(leastWaitTime)


/**
 * Retourne un tableau des arrêts communs entre deux trajets.
 *
 * @param {string} trip_id1 - L'ID du premier trajet.
 * @param {string} trip_id2 - L'ID du deuxième trajet.
 * @returns {Array} - Un tableau des arrêts communs entre les deux trajets.
 */
function getCommonArret(trip_id1, trip_id2) {
  const arrets1 = getListArretStatic(trip_id1);
  const arrets2 = getListArretStatic(trip_id2);
  const commonArrets = arrets1.filter(arret => arrets2.includes(arret));
  const vRet = []
  commonArrets.forEach(arret => {
    const heureArrivee = getHeureArrivee(trip_id1, arret);
    const heureDepart = getHeureDepart(trip_id2, arret);
    vRet.push([arret, heureArrivee, heureDepart]);
  })
  return vRet;
}

/**
 * Récupère l'heure d'arrivée d'un trajet à un arrêt spécifique.
 * @param {string} trip_id - L'identifiant du trajet.
 * @param {string} arret - L'identifiant de l'arrêt.
 * @returns {Array<string>} - Un tableau contenant les heures d'arrivée correspondantes.
 */
function getHeureArrivee(trip_id, arret) {
  return dataStopTime
    .filter(entity => entity.trip_id === trip_id && entity.stop_id === arret)
    .map(entity => entity.arrival_time);
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
function getFastestCorrespondance(correspondance){
  var fastest = correspondance[0]
  for (const corresp of correspondance) {
    if (heureToDateTime(corresp[1][2][2]) < heureToDateTime(fastest[1][2][2])) {
      fastest = corresp
    }
  }

  return fastest
}
function getLeastWaitTime(Arraylist){
  
  var durée=heureToDateTime(Arraylist[0][2])-heureToDateTime(Arraylist[0][1])

  var fastest=Arraylist[0]
  for (const arret of Arraylist) {
    if (heureToDateTime(arret[2])-heureToDateTime(arret[1])<durée){
      durée=heureToDateTime(arret[2])-heureToDateTime(arret[1])
      fastest=arret[0]
    }
  }
    return fastest
  }