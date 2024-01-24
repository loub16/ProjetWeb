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
    //const bus = await fetchTransport("bus",lastLessonHour);
    //const busHour = getBusHour(bus);
    // Display the next bus of line 2 and 6
    //document.getElementById('heure2').textContent = busHour[0];
    //document.getElementById('heure6').textContent = busHour[1];
    // Get the next tram of line B and C based on the hour of the last lesson
    //const tram = await fetchTransport("tram",lastLessonHour);
    //const tramHour = getTramHour(tram);
    // Display the next tram of line B and C
    //document.getElementById('heureB').textContent = tramHour[0];
    //document.getElementById('heureC').textContent = tramHour[1];

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
 * @param {string} arret code of the stop
 * @param {string} lessonHour date to format HH:MM:SS the hour of the lesson
 * @returns json of the transport at the hour of the lesson
 */
async function fetchTransport(arret, lessonHour){
    try {
        //arret = (transport === "bus") ? "NDAMELAC" : "1BEAU";
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
    console.log("getBusHour", transport)
    for (var key in transport) {
        if (transport.hasOwnProperty(key)) {
            if ((busTime2 == 0 || busTime2 > transport[key].arrival) && transport[key].routeId == "02" ) {
                busTime2 = transport[key].arrival;
            }else if((busTime6 == 0 || busTime6 > transport[key].arrival) && transport[key].routeId == "06"){
                busTime6 = transport[key].arrival;
            }
        }
    }
    console.log("busTime2: ",busTime2,"busTime6: ",busTime6) 
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
            if ((tramTimeB == 0 || tramTimeB > transport[key].arrival) && transport[key].routeId == "B") {
                tramTimeB = transport[key].arrival;
            }else if((tramTimeC == 0 || tramTimeC > transport[key].arrival) && transport[key].routeId == "C"){
                tramTimeC = transport[key].arrival;
            }
        }
    }

    return [tramTimeB,tramTimeC];
}


/** Adds the directions of the transport to the select menu depending of the route
 * @param {String} ligne
 */
function ajoutMenuSens(ligne){
    var select;
    switch(ligne){
        case "2":
            select = document.getElementById("sensB");
            break;
        case "6":
            select = document.getElementById("sensB");
            break;
        case "B":
            select = document.getElementById("sensT");
            break;
        case "C":
            select = document.getElementById("sensT");
            break;
    }

    select.removeAttribute("hidden");
    select.innerHTML = "";
    var option = document.createElement("option");
    option.text = "--";
    option.value = "-1";
    select.add(option);

    switch(ligne){
        case "2":
            var option = document.createElement("option");
            option.text = "BEAUCOUZÉ - ST-BARTHÉLEMY";
            option.value = "BS";
            select.add(option);
            var option = document.createElement("option");
            option.text = "ST-BARTHÉLEMY - BEAUCOUZÉ";
            option.value = "SB";
            select.add(option);
            break;
        case "6":
            var option = document.createElement("option");
            option.text = "BOUCHEMAINE - CHU-Hôpital";
            option.value = "BA";
            select.add(option);
            var option = document.createElement("option");
            option.text = "CHU-Hôpital - BOUCHEMAINE";
            option.value = "AB";
            select.add(option);
            break;
        case "B":
            var option = document.createElement("option");
            option.text = "Monplaisir - Beille-Beille Campus";
            option.value = "MB";
            select.add(option);
            var option = document.createElement("option");
            option.text = "Beille-Beille Campus - Monplaisir";
            option.value = "BM";
            select.add(option);
            break;
        case "C":
            var option = document.createElement("option");
            option.text = "Roseraie - Beille-Beille";
            option.value = "RB";
            select.add(option);
            var option = document.createElement("option");
            option.text = "Belle-Beille - Roseraie";
            option.value = "BR";
            select.add(option);
            break;
    }
}

/** Sets the hour of the transport depending of the route and the direction
 * @param {String} sens direction of the route
 */
async function setTransportHour(sens){
    if(sens == 'SB' || sens == 'BA'){
        const bus = await fetchTransport("NDAMELAC",document.getElementById('heureCours').textContent);
        const busHour = getBusHour(bus);
        const arretHour = sens == 'SB' ? busHour[0] : busHour[1];
        document.getElementById('heureBus').textContent = arretHour;
    }else if(sens == 'BS' || sens == 'AB'){
        const bus = await fetchTransport("NDAMLA-E",document.getElementById('heureCours').textContent);
        const busHour = getBusHour(bus);
        const arretHour = sens == 'BS' ? busHour[0] : busHour[1];
        document.getElementById('heureBus').textContent = arretHour;
    }else if(sens == 'BR' || sens == 'BM'){
        const tram = await fetchTransport("1BEAU",document.getElementById('heureCours').textContent);
        const tramHour = getTramHour(tram);
        const arretHour = sens == 'BM' ? tramHour[0] : tramHour[1];
        document.getElementById('heureTram').textContent = arretHour;
    }else if(sens == 'RB' || sens == 'MB'){
        const tram = await fetchTransport("2BEAU",document.getElementById('heureCours').textContent);
        const tramHour = getTramHour(tram);
        const arretHour = sens == 'MB' ? tramHour[0] : tramHour[1];
        document.getElementById('heureTram').textContent = arretHour;
    }
    
}