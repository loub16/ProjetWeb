document.addEventListener('DOMContentLoaded', async () => {
    // Get the id of the student from the url
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get('id');
    // Get the timetable of the student
    const [firstday, lastday] = getFirstAndLastDayOfCurrentWeek();
    const edt = await fetchEdt(id, firstday, lastday);
    // Get the last lesson of the day
    const lastLessonHour = getLastLessonHour(edt, getFormattedDate());
    // Display the last lesson of the day
    document.getElementById('date').textContent = formatDate(new Date());
    document.getElementById('heureCours').textContent = lastLessonHour;
    // Get the next bus of line 2 and 6 based on the hour of the last lesson
    const bus = await fetchTransport("bus",lastLessonHour);
    const busHour = getBusHour(bus);
    // Display the next bus of line 2 and 6
    document.getElementById('heure2').textContent = busHour[0];
    document.getElementById('heure6').textContent = busHour[1];
    // Get the next tram of line B and C based on the hour of the last lesson
    const tram = await fetchTransport("tram",lastLessonHour);
    const tramHour = getTramHour(tram);
    // Display the next tram of line B and C
    document.getElementById('heureB').textContent = tramHour[0];
    document.getElementById('heureC').textContent = tramHour[1];

});


/** Fetch the timetable of a student in JSON format from the server
 * @param {string} id The ID of the student
 * @param {string} datedebut date of the first day of the current week
 * @param {string} datefin date of the last day of the current week
 * @returns {JSON} the timetable in JSON
 * */
async function fetchEdt(id, datedebut, datefin) {
    try {
        const response = await fetch(`/getEdt?id=${id}&dateDebut=${datedebut}&dateFin=${datefin}`);
        const edt = await response.json();
        return edt;
    } catch (error) {
        console.error(error);
    }

}

/** Get the first and last day of the current week
 * @returns {Array} the first and last day in an array in format : YYYYMMDD
 * */
function getFirstAndLastDayOfCurrentWeek() {
    var curr = new Date();
    var first = curr.getDate() - curr.getDay() + 1;
    var last = first + 6;

    // Create new Date objects for firstday and lastday
    var firstday = new Date(curr.setDate(first)).toISOString().slice(0, 10).replace(/-/g, "");
    curr = new Date(); // Reset curr to the current date
    var lastday = new Date(curr.setDate(last)).toISOString().slice(0, 10).replace(/-/g, "");
    return [firstday, lastday];
}

/** Get the first and last day of the asked week
 * @param {String} date the date to get the first and last day of in format : YYYY-MM-DD
 * @returns {Array} the first and last day in an array in format : YYYYMMDD
 * */
function getFirstAndLastDayOfAnyWeek(date) {
    var date = new Date(date);
    var first = date.getDate() - date.getDay() + 1;
    var last = first + 6;

    // Create new Date objects for firstday and lastday
    var firstday = new Date(date.setDate(first)).toISOString().slice(0, 10).replace(/-/g, "");
    var date = new Date(date);
    var lastday = new Date(date.setDate(last)).toISOString().slice(0, 10).replace(/-/g, "");
    return [firstday, lastday];
}

/** Get the hour of the end of the last lesson of the day
 * @param {JSON} json The JSON of the timetable
 * @param {string} date The date of the day to get the last lesson of in format : DD/MM/YYYY
 * @returns {string} the hour in format : HH:MM:SS
 * */
function getLastLessonHour(json, date) {
    let lastHour = "";

    json.forEach(lesson => {
        lesson = JSON.stringify(lesson);
        lesson = JSON.parse(lesson);
        const date_debut = lesson.date_debut;
        const date_day = date.slice(0, 2);
        const date_month = date.slice(3, 5);
        const date_year = date.slice(6, 10);
        if (date_debut.slice(0, 2) == date_day && date_debut.slice(3, 5) == date_month && date_debut.slice(6, 10) == date_year) {
            if (lesson.date_fin.slice(-8) > lastHour) {
                lastHour = lesson.date_fin.slice(-8);
            }
        }
    })
    return lastHour;
}

/** Format the date in the french format
 * @param {Date} date date to format
 * @returns formatted date
 */
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

/** Get the current date in dd/mm/yyyy format
 * @returns formatted date (string) in format dd/mm/yyyy
 */
function getFormattedDate() {
    const today = new Date();

    // Get day, month, and year
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so we add 1
    const year = today.getFullYear();

    // Create the formatted date string
    const formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
}

/** Convert a date in a timesamp
 * @param {string} date date to convert in format HH:MM:SS
 * @returns timestamp (int)
 */
function dateToTimestamp(date) {
    const currentDate = new Date();
    dateSplit = date.split(':');

    currentDate.setHours(dateSplit[0]);
    currentDate.setMinutes(dateSplit[1]);
    currentDate.setSeconds(dateSplit[2]);
    currentDate.setMilliseconds(0);

    // Get the timestamp in milliseconds since the Unix epoch (January 1, 1970 00:00:00 UTC)
    const timestamp = currentDate.getTime();
    return timestamp;
}
/** Fetch the transport trips at a given hour from the server
 * @param {string} transport "bus" or "tram" the transport to get the hour of
 * @param {string} lessonHour date to format HH:MM:SS the hour of the lesson
 * @returns json of the transport at the hour of the lesson
 */
async function fetchTransport(transport, lessonHour){
    try {
        arret = (transport === "bus") ? "NDAMELAC" : "1BEAU";
        const response = await fetch('http://localhost:3000/getTransport?arret=' + arret + '&heure=' + dateToTimestamp(lessonHour));
        const bus = await response.json();
        return bus;
    }catch (error) {
        console.error(error);
    }
}

/** Get the next bus of line 2 and 6
 * @param {JSON} transport json of the transport at the hour of the lesson
 * @returns array of the next bus of line 2 and 6
 */
function getBusHour(transport){
    
    var busTime2 = 0;
    var busTime6 = 0;
    for (var key in transport) {
        if (transport.hasOwnProperty(key)) {
            if ((busTime2 == 0 || busTime2 > transport[key].arrival.time) && transport[key].routeId == "02" ) {
                busTime2 = transport[key].arrival.time;
            }else if((busTime6 == 0 || busTime6 > transport[key].arrival.time) && transport[key].routeId == "06"){
                busTime6 = transport[key].arrival.time;
            }
        }
    }
    busTime2 = new Date(parseInt(busTime2, 10)*1000)
    busTime2 = busTime2.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });  
    busTime6 = new Date(parseInt(busTime6, 10)*1000)
    busTime6 = busTime6.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); 
    return [busTime2,busTime6];
}

/** Get the next tram of line B and C
 * @param {JSON} transport json of the transport at the hour of the lesson
 * @returns array of the next tram of line B and C
 */
function getTramHour(transport){
    
    var tramTimeB = 0;
    var tramTimeC = 0;
    for (var key in transport) {
        if (transport.hasOwnProperty(key)) {
            if ((tramTimeB == 0 || tramTimeB > transport[key].arrival.time) && transport[key].routeId == "B") {
                tramTimeB = transport[key].arrival.time;
            }else if((tramTimeC == 0 || tramTimeC > transport[key].arrival.time) && transport[key].routeId == "C"){
                tramTimeC = transport[key].arrival.time;
            }
        }
    }
    tramTimeB = new Date(parseInt(tramTimeB, 10)*1000)
    tramTimeB = tramTimeB.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });  
    tramTimeC = new Date(parseInt(tramTimeC, 10)*1000)
    tramTimeC = tramTimeC.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });  
    return [tramTimeB,tramTimeC];
}