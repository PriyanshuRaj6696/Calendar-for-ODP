/* =========================
   INITIAL STATE
========================= */

const today = new Date();   // real system date (never changes)

/*let year = today.getFullYear();
let month = today.getMonth();
let cday = today.getDate();*/
/* For testing purposes, we can set a fixed date */
let year = 2026;
let month = 8;
let cday = 15;
const day = document.querySelector(".calendar-dates");
const currdate = document.querySelector(".calendar-current-date");
const prenexIcons = document.querySelectorAll(".calendar-navigation div");
const datepreview = document.querySelector(".date-preview");

/* Variables to store month details */
let dayone = new Date(year, month, 1).getDay();
let lastdate = new Date(year, month + 1, 0).getDate();
let dayend = new Date(year, month, lastdate).getDay();
let monthlastdate = new Date(year, month, 0).getDate();


const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let clickedDay = null;
let selectedDayElement = null;
let previewlist = ""  /** Stores previews */


/* =========================
   Event listing
========================= */
async function loadEvents() {
    const res = await fetch("http://127.0.0.1:5000//api/calendar-events/" + window.calendarUsername + "?cday=" + cday + "&cmonth=" + (month + 1) + "&cyear=" + year);
    const data = await res.json();
    //console.log("Events data:", data);  // Debug log
    events = data.events;
    return events;
}

async function loadclickedEvents() {
    const res = await fetch("http://127.0.0.1:5000//api/calendar-events/" + window.calendarUsername + "?cday=" + clickedDay + "&cmonth=" + (month + 1) + "&cyear=" + year);
    const data = await res.json();
    //console.log("Events data:", data);  // Debug log
    events = data.events;
    return events;
}

/* Load Events monthly on page load */


/* =========================
   DATE PREVIEW
========================= */

async function updateDatePreview() {

  let selecteddate;
  let events = [];
  let daywiseevents = [];

  if (clickedDay) {
    selecteddate = `${clickedDay} ${months[month]} ${year}`;
    events = await loadclickedEvents();  // Call the function to load events for the clicked date
  } else {
    selecteddate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    events = await loadEvents();  // Call the function to load events on page load
  }

  /** Cleanup */
  datedivselect = document.querySelector(".date-preview");
  datedivselect.innerHTML = "";
  previewlist = "";

  /** Addup */
  previewlist += `<div class="selecteddate">${selecteddate}</div>`;

  /* If no events, show message */
  if (events.length === 0) {
    previewlist += `<div class="event-item">No events scheduled for this date.</div>`;
  }

  /* Make daywise event from retrieved event info */
  events.forEach(event => {
    if (clickedDay >= event.start_day && (month + 1) >= event.start_month && event.start_year === year) {
      if (event.repetition.split(" ")[0] === "Every") {
        let eventstartday = []
        eventstartday = event.repetition.split(" ")[1];
        //console.log("First Date of month:", new Date(year, month, event.start_day));  // Debug log
        //console.log("First Day of month:", days[dayone]);  // Debug log
        //console.log("Event Start Day:", days[eventstartday]);  // Debug log
        //console.log("Starting date for the event:", event.start_day);  // Debug log
        /* Loop to find the first occurrence of the event in the month */
        for (let i = 0; i < 7; i++) {
          event.start_day = event.start_day + 1;
          //console.log("After increasing by 1 Event Start date:", event.start_day);  // Debug log
          //console.log("After increasing by 1 Event Start Day:", days[new Date(year, month, event.start_day).getDay()]);  // Debug log
          if (new Date(year, month, event.start_day).getDay() == eventstartday) {
            //console.log("Event added for preview:", event.start_day);  // Debug log
            break;
          }
        }
        //console.log("Clicked Day:", clickedDay);  // Debug log
        for (let j = event.start_day; j <= lastdate; j += 7) {
          if (j == clickedDay) {
            daywiseevents.push(event);
            //console.log("Event added for preview:", event);  // Debug log
          }
        }
      } else if (event.repetition.split(" ")[0] === "Alternate") {
        let eventstartday = []
        // Handle alternate repetition logic
        eventstartday = event.repetition.split(" ")[1].split(",");
        let week = event.repetition.split(" ")[2];  // "Week1" or "Week2"
        //console.log("Alternate Event Start Day:", eventstartday, "Type:", typeof eventstartday);  // Debug log
        eventstartday.forEach(day => {
          console.log("1.Event Start Day:", days[day]);  // Debug log
          for (let i = 0; i < 7; i++) {
            event.start_day = event.start_day + 1;
            console.log("After increasing by 1 Event Start date:", event.start_day);  // Debug log
            console.log("After increasing by 1 Event Start Day:", days[new Date(year, month, event.start_day).getDay()]);  // Debug log
            if (new Date(year, month, event.start_day).getDay() == day) {
              console.log("Event added for preview:", event.start_day);  // Debug log
              break;
            }
          }
          console.log("2.Event Start Day:", days[new Date(year, month, event.start_day).getDay()]);  // Debug log
          console.log("Clicked Day:", clickedDay);  // Debug log
          console.log("Week Type:", week);  // Debug log
          if (week == 0) {
            console.log("Entered Week 1 logic");  // Debug log
            for (let j = event.start_day; j <= lastdate; j += 14) {
              if (j == clickedDay) {
                daywiseevents.push(event);
                console.log("Event added for preview:", event);  // Debug log
              }
            }
          } else if (week == 1) {
            console.log("Entered Week 2 logic");  // Debug log
            for (let j = event.start_day + 7; j <= lastdate; j += 14) {
              if (j == clickedDay) {
                daywiseevents.push(event);
                console.log("Event added for preview:", event);  // Debug log
              }
            }
          }
        });
      } else {
        // Do Nothing
      }
    };
  });

  /* Loop through events and create preview items */
  daywiseevents.forEach(event => {
    previewlist += `<div class="event-item">
                      <div class="event-title">${event.coursename} (${event.coursecode})</div>
                        <div class="event-details">
                          <p>${event.professorname}</p>
                          <p>${event.sessiontype}</p>
                      </div>
                    </div>`;
  });

  //console.log("Events for preview:", previewlist);  // Debug log

  datepreview.innerHTML += previewlist;
}


/* =========================
   MAIN CALENDAR RENDER
========================= */

const manipulate = () => {

  let lit = "";


  /* ---- previous month ---- */
  for (let i = dayone; i > 0; i--) {
    lit += `<li class="inactive">${monthlastdate - i + 1}</li>`;
  }


  /* ---- current month ---- */
  for (let i = 1; i <= lastdate; i++) {

    /* today highlight */
    let isToday =
      (i === today.getDate() &&
       month === today.getMonth() &&
       year === today.getFullYear())
      ? "active" : "";

    /* clicked highlight */
    let highlightClass =
      (clickedDay === i) ? "highlight" : "";

    lit += `<li class="${isToday} ${highlightClass}" data-day="${i}">${i}</li>`;
  }


  /* ---- next month ---- */
  for (let i = dayend; i < 6; i++) {
    lit += `<li class="inactive">${i - dayend + 1}</li>`;
  }

// Calendar header and lighting the month days
  currdate.innerText = `${months[month]} ${year}`;
  day.innerHTML = lit;

  addClickListenersToDays();
  updateDatePreview();   //  update preview every render
};


/* =========================
   CLICK HANDLER
========================= */

function addClickListenersToDays() {

  const allDays = day.querySelectorAll("li:not(.inactive)");

  allDays.forEach(li => {
    li.addEventListener("click", () => {

      if (selectedDayElement) {
        selectedDayElement.classList.remove("highlight");
        
      }

      li.classList.add("highlight");
      selectedDayElement = li;

      clickedDay = parseInt(li.dataset.day);

      updateDatePreview();  // update instantly
    });
  });
}


/* =========================
   MONTH NAVIGATION
========================= */

prenexIcons.forEach(icon => {

  icon.addEventListener("click", () => {

    month = icon.id === "calendar-prev" ? month - 1 : month + 1;

    if (month < 0 || month > 11) {
      const temp = new Date(year, month, 1);
      year = temp.getFullYear();
      month = temp.getMonth();
    }

    clickedDay = null;
    selectedDayElement = null;

    manipulate();
  });

});


/* =========================
   INITIAL LOAD
========================= */

manipulate();


