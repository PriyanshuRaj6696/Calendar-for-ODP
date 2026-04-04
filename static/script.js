/* =========================
   INITIAL STATE
========================= */

const today = new Date();   // real system date (never changes)

let year = today.getFullYear();
let month = today.getMonth();

const day = document.querySelector(".calendar-dates");
const currdate = document.querySelector(".calendar-current-date");
const prenexIcons = document.querySelectorAll(".calendar-navigation div");
const datepreview = document.querySelector(".date-preview");
const mainBody = document.querySelector(".mainbody");
let calendarEventData = [];

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

let clickedDay = null;
let selectedDayElement = null;
let previewlist = ""  /** Stores previews */

function parseDateParts(dateText) {
  if (!dateText) return null;

  const parts = String(dateText).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [dayValue, monthValue, yearValue] = parts;
  return { day: dayValue, month: monthValue - 1, year: yearValue };
}

function eventMatchesDay(eventItem, dayValue, monthValue, yearValue) {
  const start = parseDateParts(eventItem.start_date);
  const end = parseDateParts(eventItem.end_date);

  if (!start || !end) return false;

  const current = new Date(yearValue, monthValue, dayValue).getTime();
  const startTime = new Date(start.year, start.month, start.day).getTime();
  const endTime = new Date(end.year, end.month, end.day).getTime();

  return current >= startTime && current <= endTime;
}

function getEventsForDay(dayValue, monthValue, yearValue) {
  return calendarEventData.filter(eventItem => eventMatchesDay(eventItem, dayValue, monthValue, yearValue));
}

async function loadCalendarEvents() {
  const username = window.calendarUsername || mainBody?.dataset?.username;

  if (!username) {
    manipulate();
    return;
  }

  try {
    const response = await fetch(`/api/calendar-events/${encodeURIComponent(username)}`);
    const data = await response.json();
    calendarEventData = Array.isArray(data.events) ? data.events : [];
  } catch (_error) {
    calendarEventData = [];
  }

  manipulate();
}




/* =========================
   DATE PREVIEW
========================= */

function updateDatePreview() {

  let selecteddate;

  if (clickedDay) {
    selecteddate = `${clickedDay} ${months[month]} ${year}`;
  } else {
    selecteddate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  }

  /** Cleanup */
  datedivselect = document.querySelector(".date-preview");
  datedivselect.innerHTML = "";
  previewlist = "";

  /** Addup */
  previewlist += `<div class="selecteddate">${selecteddate}</div>`;
  const selectedEvents = clickedDay ? getEventsForDay(clickedDay, month, year) : getEventsForDay(today.getDate(), today.getMonth(), today.getFullYear());

  if (selectedEvents.length) {
    previewlist += `<div class="event-list">`;
    selectedEvents.forEach(eventItem => {
      previewlist += `<div class="event-card">
        <div class="event-title">${eventItem.coursename}</div>
        <div class="event-meta">${eventItem.coursecode} · ${eventItem.sessiontype}</div>
        <div class="event-meta">${eventItem.start_time} - ${eventItem.end_time}</div>
        <div class="event-meta">${eventItem.professorname}</div>
      </div>`;
    });
    previewlist += `</div>`;
  } else {
    previewlist += `<div class="no-events">No events for this date.</div>`;
  }
  

  datepreview.innerHTML += previewlist;
}


/* =========================
   MAIN CALENDAR RENDER
========================= */

const manipulate = () => {

  let dayone = new Date(year, month, 1).getDay();
  let lastdate = new Date(year, month + 1, 0).getDate();
  let dayend = new Date(year, month, lastdate).getDay();
  let monthlastdate = new Date(year, month, 0).getDate();

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

    const dayEvents = getEventsForDay(i, month, year);
    const eventBadge = dayEvents.length ? `<span class="event-badge">${dayEvents.length}</span>` : "";

    lit += `<li class="${isToday} ${highlightClass} has-event" data-day="${i}">${i}${eventBadge}</li>`;
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

loadCalendarEvents();


