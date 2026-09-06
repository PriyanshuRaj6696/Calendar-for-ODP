/* =========================
   INITIAL STATE
========================= */

const today = new Date();

let year = today.getFullYear();
let month = today.getMonth();

const day = document.querySelector(".calendar-dates");
const currdate = document.querySelector(".calendar-current-date");
const prenexIcons = document.querySelectorAll(".calendar-navigation div");
const datepreview = document.querySelector(".date-preview");


const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MAX_EXTENSION_DAYS = 120; // Hard stop for event generation to avoid infinite loops in case of misconfigured repetition rules.

const EVENT_COLORS = {
  NPT: "#00a2ff",
  PT: "#ef4444",
  ST: "#f59e0b",
  LIVE: "#079621",
  LAB: "#a855f7",
  DEFAULT: "#38f3b1",
};

let clickedDay = null;
let selectedDayElement = null;

let cachedEvents = [];
let eventTable = [];
let eventsByDate = new Map();


/* =========================
   Event Data (Load Once)
========================= */
// This function generates a unique key for a given date in the format "YYYY-MM-DD".
function dateKey(dateValue) {
  const y = dateValue.getFullYear();
  const m = String(dateValue.getMonth() + 1).padStart(2, "0");
  const d = String(dateValue.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
// This function parses the repetition text for an event and returns an object containing the mode, dayList, and sessionstartweek.
function parseRepetition(text) {
    const [eventoccurrences = "", eventdays = "", eventstartweek = ""] =
        String(text || "").trim().split(/\s+/);

    const dayList = eventdays
        .split(",")
        .filter(Boolean)
        .map(Number);


    return {
        eventoccurrences: Number(eventoccurrences),
        eventdaylist: dayList,
        eventstartweek: Number(eventstartweek)
    };
}

// This function calculates the first occurrence of a specified weekday on or after a given start date.
function firstWeekdayOnOrAfter(startDate, weekday) {
  const delta = (weekday - startDate.getDay() + 7) % 7;
  const dateValue = new Date(startDate);
  dateValue.setDate(dateValue.getDate() + delta);
  return dateValue;
}

/*
function parseSessionType(sessionTypeText) {
  const raw = String(sessionTypeText || "").trim();
  const match = raw.match(/^([A-Za-z]+)(?:-(\d+))?(?:\s*\(([^)]+)\))?$/);

  if (!match) {
    return {
      baseType: (raw || "DEFAULT").toUpperCase(),
      targetCount: 6,   // Default to 6 if not specified. Set Test or session count to
      slotName: "",
    };
  }

  return {
    baseType: match[1].toUpperCase(),
    targetCount: match[2] ? Number(match[2]) : 6,
    slotName: match[3] ? match[3].trim() : "",
  };
} */

function eventColorForType(baseType) {
  return EVENT_COLORS[baseType] || EVENT_COLORS.DEFAULT;
}

// This function turns each course/time slot into calendar entries.
// It finds all repeating dates for an event, then stores them by date so the UI can quickly show events for a selected day.
function buildEventIndex(events) {
  console.log("Building event index for", events.length, "events.");
  eventTable = [];
  eventsByDate = new Map();

  cachedEvents.forEach((event, index) => {
    console.log(`Processing event ${index + 1}/${cachedEvents.length}:`, event);
    const event_start_date = new Date(event.start_year, event.start_month - 1, event.start_day);
    const event_end_date = new Date(event.end_year, event.end_month - 1, event.end_day);
    //console.log("event_start_date:", event_start_date, "event_end_date:", event_end_date);
    const event_start_time = event.start_time;
    const event_end_time = event.end_time;
    //console.log("event_start_time:", event_start_time, "event_end_time:", event_end_time);
    const eventColor = eventColorForType(event.sessiontype);
    const sessiontype = event.sessiontype.trim();
    //console.log("sessiontype:", sessiontype, "eventColor:", eventColor);
    const {eventoccurrences, eventdaylist, eventstartweek} = parseRepetition(event.repetition);
    console.log("Parsed repetition for event:", {eventoccurrences, eventdaylist, eventstartweek});
    const anchorWeekday = eventdaylist[0]; // Use the first specified weekday as the anchor for the repetition pattern.
    /**
     * Find the first Monday on or after the given date.
     * Find the first day in the pattern that matches the event days using first monday of the month stored in effectiveEventStartDate.
     */
    const firstMonday = firstWeekdayOnOrAfter(event_start_date, 1); // 1 = Monday
    let effectiveEventStartDate = firstWeekdayOnOrAfter(firstMonday, anchorWeekday); // Start from the first Monday of the month for the repetition pattern.
    console.log("firstMonday:", firstMonday, "effectiveEventStartDate:", effectiveEventStartDate);

    //console.log("anchorWeekday:", anchorWeekday);
    const startingPointOfEventDate = effectiveEventStartDate; // Use the effectiveEventStartDate as the starting point for generating occurrences.
    startingPointOfEventDate.setDate(startingPointOfEventDate.getDate() + eventstartweek * 7); // Adjust the first event date based on the session start week.
    console.log("firstEventDate", startingPointOfEventDate, "Event's first weekday", anchorWeekday);

    /**
     * Generate occurrences based on the repetition mode and the specified weekdays.
     * For "Every" mode, generate occurrences every week on the specified weekdays.
     * For "Alternate" mode, generate occurrences every x weeks on the specified weekdays where x is the week interval.
     */

    let currentDate = new Date(startingPointOfEventDate);

    for (let eventoccurrenceCount = 1; eventoccurrenceCount < eventoccurrences+1; eventoccurrenceCount++) {
      for ( let dayIndex = 0; dayIndex < eventdaylist.length; dayIndex++) {
        const weekday = eventdaylist[dayIndex];
        const occurrenceDate = firstWeekdayOnOrAfter(currentDate, weekday);
        console.log("Generating occurrence for date:", occurrenceDate, "currentDate:", currentDate, "eventoccurrenceCount:", eventoccurrenceCount, "dayIndex:", dayIndex, "eventdaylist[dayIndex]:", eventdaylist[dayIndex]);
        const isWeekend = weekday === 0 || weekday === 6; // Check if the current date is a weekend (Saturday or Sunday).
        const dynamicSlotName = isWeekend ? "Slot-B" : "Slot-A"; // Assign dynamic slot names based on whether the current date is a weekend or a weekday.
        if (sessiontype === "PT") {
          displaySessionType = `${sessiontype}-${eventoccurrenceCount} (${dynamicSlotName})`;
        } else {
          displaySessionType = `${sessiontype}-${eventoccurrenceCount}`;
        }
        
        const key = dateKey(occurrenceDate);
        const record = {
          date: key,
          event: event,
          eventColor: eventColor,
          occurrenceCount: eventoccurrenceCount + 1,
          displaySessionType: `${displaySessionType}`,
        };
        //console.log("Adding record for date", key, ":", record);

        eventTable.push(record);

        // Group events by date for quick lookup when rendering the calendar.
        if (!eventsByDate.has(key)) {
          eventsByDate.set(key, []);
        }

        // Add the record to the list of events for this date.
        eventsByDate.get(key).push(record);
        //console.log("Added record for date", key, ":", record);

        console.log(record, "record");

        let tempcurrentDate = new Date(currentDate);
        if (eventdaylist.length === dayIndex + 1) {
          //console.log("");
          currentDate.setDate(occurrenceDate.getDate() + 1 + ((12/eventoccurrences)-1)*7);
          if (tempcurrentDate > currentDate) {
            let date = currentDate.getDate();
            let month = currentDate.getMonth();
            let year = currentDate.getFullYear();
            currentDate = new Date(year, month + 1, date);
          }
        } else {
          currentDate.setDate(currentDate.getDate() + 1); // Move to the next day after the occurrence for the next iteration.
          if (tempcurrentDate > currentDate) {
            let date = currentDate.getDate();
            let month = currentDate.getMonth();
            let year = currentDate.getFullYear();
            currentDate = new Date(year, month + 1, date);
          }
        }
      }
    }
    
  

    //const currentDate = new Date(); // Replace with the actual current date
    //const key = dateKey(currentDate);
    /*const record = {
      date: key,
      event: event,
      eventColor: eventColor,
      occurrenceCount: eventcount,
      displaySessionType,
    };
    //console.log("Adding record for date", key, ":", record);

    eventTable.push(record);

    // Group events by date for quick lookup when rendering the calendar.
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, []);
    }

    // Add the record to the list of events for this date.
    eventsByDate.get(key).push(record);
    console.log("Added record for date", key, ":", record);*/
  });
}

async function loadEventsOnce() {
  if (cachedEvents.length > 0) {
    return;
  }

  const res = await fetch(`/api/calendar-events/${encodeURIComponent(window.calendarUsername)}`);
  const data = await res.json();
  cachedEvents = Array.isArray(data.events) ? data.events : [];
  console.log(`Loading Funtion: ${cachedEvents.length} events for user ${window.calendarUsername}`);
  console.log("Cached Events:", cachedEvents);
  buildEventIndex(cachedEvents);
}


/* =========================
   DATE PREVIEW
========================= */

function selectedDateForPreview() {
  if (clickedDay) {
    return new Date(year, month, clickedDay);
  }
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function updateDatePreview() {
  const selectedDate = selectedDateForPreview();
  const key = dateKey(selectedDate);
  const daywiseevents = eventsByDate.get(key) || [];

  let previewlist = "";
  previewlist += `<div class="selecteddate">${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}</div>`;

  if (daywiseevents.length === 0) {
    previewlist += `<div class="event-item">No events scheduled for this date.</div>`;
  }

  daywiseevents
  .sort((a, b) => a.event.start_time.localeCompare(b.event.start_time))
  .forEach(entry => {
    const event = entry.event;

    previewlist += `<div class="event-item">
                      <div class="event-title" style="border-left: 6px solid ${entry.eventColor}; padding-left: 8px;">
                        ${event.coursename} (${event.coursecode}) | ${entry.displaySessionType}
                      </div>
                      <div class="event-details">
                        <p>Professor: ${event.professorname}</p>
                        <p>Start Time: ${event.start_time}</p>
                        <p>End Time: ${event.end_time}</p>
                      </div>
                    </div>`;
  });

  datepreview.innerHTML = previewlist;
}

// 
function getEventDotsMarkup(dayEntries) {
  const eventCount = dayEntries.length;
  if (eventCount <= 0) {
    return "";
  }

  const maxVisibleDots = 3; // Show 3 dots for simplicity, can be increased if needed
  const visibleDots = Math.min(eventCount, maxVisibleDots);
  const overflowCount = eventCount - visibleDots;

  const dots = dayEntries
    .slice(0, visibleDots)
    .map(entry => `<span class="event-dot" style="background:${entry.eventColor};"></span>`)
    .join("");
  const overflow = overflowCount > 0 ? `<span class="event-overflow">+${overflowCount}</span>` : "";

  return `<span class="event-dots" aria-label="${eventCount} events">${dots}${overflow}</span>`;
}


/* =========================
   MAIN CALENDAR RENDER
========================= */

const manipulate = () => {
  const dayone = new Date(year, month, 1).getDay();
  const lastdate = new Date(year, month + 1, 0).getDate();
  const dayend = new Date(year, month, lastdate).getDay();
  const monthlastdate = new Date(year, month, 0).getDate();

  let lit = "";

  for (let i = dayone; i > 0; i--) {
    lit += `<li class="inactive">${monthlastdate - i + 1}</li>`;
  }

  for (let i = 1; i <= lastdate; i++) {
    const isToday =
      i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
        ? "active"
        : "";

    const highlightClass = clickedDay === i ? "highlight" : "";
    const currentDate = new Date(year, month, i);
    const key = dateKey(currentDate);
    const dayEntries = eventsByDate.get(key) || [];
    const eventCount = dayEntries.length;
    const hasEventsClass = eventCount > 0 ? "has-events" : "";
    const dotMarkup = getEventDotsMarkup(dayEntries);

    lit += `<li class="${isToday} ${highlightClass} ${hasEventsClass}" data-day="${i}"><span class="day-number">${i}</span>${dotMarkup}</li>`;
  }

  for (let i = dayend; i < 6; i++) {
    lit += `<li class="inactive">${i - dayend + 1}</li>`;
  }

  currdate.innerText = `${months[month]} ${year}`;
  day.innerHTML = lit;

  addClickListenersToDays();
  updateDatePreview();
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

      clickedDay = parseInt(li.dataset.day, 10);
      updateDatePreview();
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

async function initializeCalendar() {
  try {
    await loadEventsOnce();
  } catch (_error) {
    cachedEvents = [];
    eventTable = [];
    eventsByDate = new Map();
  }

  manipulate();
}

initializeCalendar();


// Check 