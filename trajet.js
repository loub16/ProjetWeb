import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import * as fs from 'fs';
import  AdmZip from "adm-zip";
import path from 'path';



/** 
 * fonction qui retourne un dictionaire contenant l'id des transport,
 * qui passeront à l'arret a l'heure de sortie, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @param {timeSTAMP} heureDepart  l'heure a laquelle l'utilisateur souhaite partir
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */
export async function getTransportAt(arret, heureDepart){
  const date = Date.now();
  var transports = {};
  console.log(heureDepart-date)
  //cas où l'heure de départ est dans le passé (ou dans moins de 30 min) on retourne les transports actuellement en circulation
  if(heureDepart-date<=1800000 || true){
     transports=await getTransportAtRT(arret)
  }
  else{
    transports=await getTransportAtStatic(arret, heureDepart)
  }
  return transports
}

/** 
 * fonction qui retourne {@link dict}, un dictionaire contenant l'id des transport, actuellement en circulations, 
 * passant à l'arret, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */

async function  getTransportAtRT(arret){

 /**
 * @namespace
 * @property {object}         trip                  -id du transport s'arrétant à l'arrêt
 * @property {int | string}   trip.routeId          -id de la ligne du transport
 * @property {timeSTAMP}      trip.arrival          -timestamp de l'arrivée du transport à l'arrêt
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
    var i = 0
    feed.entity.forEach((entity) => {
      if (entity.tripUpdate) {
        entity.tripUpdate.stopTimeUpdate.forEach((TimeUpdate) => {
            if (TimeUpdate.stopId === arret) {
              dict[entity.id] = {routeId: entity.tripUpdate.trip.routeId, arrival: TimeUpdate.arrival };
              i++;
            }
        })
      }
    });
    //décommenter pour exporter le fichier
    /*const fs = require('fs');
    function saveJSON(data, filename) {
      fs.writeFileSync(`${filename}.json`, JSON.stringify(data));
    }
    saveJSON(dict, 'output');*/
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
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */
 async function getTransportAtStatic(arret, heureDepart){

   /**
 * @namespace
 * @property {object}         trip                  -id du transport s'arrétant à l'arrêt
 * @property {int | string}   trip.routeId          -id de la ligne du transport
 * @property {timeSTAMP}      trip.arrival          -timestamp de l'arrivée du transport à l'arrêt
 */

var dict = {};
 return "pas encore fait"
}

/**
  * fonction qui télécharge le fichier gtfs-rt et le décompresse
 */
export async function initTrajet(){
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
