import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";


/** 
 * fonction qui retourne {@link dict}, un dictionaire contenant l'id des transport, actuellement en circulations, 
 * passant à l'arret, leur id de lignes et le timestamp de leur arrivée à l'arrêt
 * @param {String} arret  nom de l'arrêt
 * @returns {object} dictionaire contenant les informations des transports passant à l'arrêt
 * */

export default async function  getTransportAt(arret){

 /**
 * @namespace
 * @property {object}         trip                  -id du transport s'arrétant à l'arrêt
 * @property {int | string}   trip.routeId          -id de la ligne du transport
 * @property {timeSTAMP}      trip.arrival          -timestamp de l'arrivée du transport à l'arrêt
 *
 */
var dict = {};

  console.log("try")
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

