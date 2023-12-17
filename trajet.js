import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import * as fs from 'fs';
import  AdmZip from "adm-zip";
import path from 'path';
import * as csvToJson from "convert-csv-to-json";




/** 
 * fonction qui retourne un dictionaire contenant l'id des transport,
 * qui passeront à l'arret a l'heure de sortie, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @param {timeSTAMP} datedepart  l'heure a laquelle l'utilisateur souhaite partir
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */
export async function getTransportAt(arret, datedepart){
  const date = Date.now();
  const date30=new Date(new Date(date).getTime()+1800000)
  initTrajet()
  var transports = {};

  //cas où l'heure de départ est dans le passé (ou dans moins de 30 min) on retourne les transports actuellement en circulation
  if((date>datedepart || datedepart<date30)){

     transports=await getTransportAtRT(arret)
  }
  else{
    transports=await getTransportAtStatic(arret, datedepart)
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

  var dict = {}
  console.log("hour ",new Date(heureDepart).toLocaleTimeString())
  const dataStopTime=await csvToJson.fieldDelimiter(',').getJsonFromCsv("donnees\\trajet_static\\stop_times.csv");
  const dataTrip= await csvToJson.fieldDelimiter(',').getJsonFromCsv("donnees\\trajet_static\\trips.csv");
  var idLigne
  const hourstring="2023-10-10 "
  
  var heuredep =new Date( hourstring+new Date(heureDepart).toLocaleTimeString());

  /**heure de départ prévu plus 1h */
  var heuredep1= new Date(heureDepart.getTime()+3600000)
  dataStopTime.forEach( (entity) => {

    const datetrajet = new Date(hourstring + entity.arrival_time);
          if (entity.stop_id === arret && datetrajet.getTime()>=heuredep.getTime() && datetrajet.getTime()<=heuredep1.getTime() ) {
            idLigne =  getIdLigne(dataTrip,entity.trip_id);
            dict[entity.trip_id] =  {routeId: idLigne, arrival: entity.arrival_time };

          }
        })
  dict=extratXperLigne(dict, 2)
  return dict
}

/**
 * fonction qui retourne l'id de la ligne d'un transport
 * @param {object} data  données du fichier trips.csv
 * @param {string} idTrip  id du transport
 * @returns {string} id de la ligne
 */
 function getIdLigne(data,idTrip){
  var id=""
  data.forEach((entity) => {
    if (entity.trip_id === idTrip) {
      id=entity.route_id      
    }
  })
  return (id)
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

/**
 * fonction qui modifie le dictionaire pour ne guarder que X trajets par lignes
 * @param {object} dictionaire contenant les informations des transports passant à l'arrêt
 * @param {int} nbtrajet nombre de trajet par ligne
 * @returns {object} dictionaire contenant X trajet par ligne
 */
function extratXperLigne(data, nbtrajet){
var lignesprésentes= new Map()
var dict={}
Object.keys(data).forEach( (entity) => {
  if (!lignesprésentes.has(data[entity].routeId)) {
    lignesprésentes.set(data[entity].routeId,nbtrajet-1)
    dict[entity]=data[entity]
    
  }else if(lignesprésentes.get(data[entity].routeId)>0){
    lignesprésentes.set(data[entity].routeId,lignesprésentes.get(data[entity].routeId)-1)
    dict[entity]=data[entity]
}
});
return dict

}
