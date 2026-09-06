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

function dateKey(dateValue) {
  const y = dateValue.getFullYear();
  const m = String(dateValue.getMonth() + 1).padStart(2, "0");
  const d = String(dateValue.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseRepetition(repetitionText) {
  const parts = String(repetitionText || "").trim().split(/\s+/);
  const mode = parts[0] || "";
  const dayPart = parts[1] || "";
  const sessionstartweek = parts[2] || "";

  const dayList = dayPart
    .split(",")
    .map(v => parseInt(v, 10))
    .filter(v => !Number.isNaN(v));

  return { mode, dayList, sessionstartweek };
}

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
  eventTable = [];
  eventsByDate = new Map();

  events.forEach(event => {
    const startDate = new Date(
      Number(event.start_year),
      Number(event.start_month) - 1,
      Number(event.start_day)
    );

    const endDate = new Date(
      Number(event.end_year),
      Number(event.end_month) - 1,
      Number(event.end_day)
    );

    const { mode, dayList, sessionstartweek } = parseRepetition(event.repetition);
    if (mode === "") {
      console.warn("Session mode is empty:", event);
    }
    if (dayList === "") {
      console.warn("Day list is empty:", event);
    }
    if (mode === "") {
      console.warn("Session mode is empty:", event);
    }
    if (sessionstartweek === "") {
      console.warn("Session start week is empty:", event);
    }
    // console.log("Session start week:", sessionstartweek, "Mode:", mode, "Day List:", dayList);
    const hissa = event.sessiontype.trim().split(/\s+/);
    const baseType = hissa[0].toUpperCase();
    const targetCount = Number(hissa[1]); // Take session counts from the session type if available, otherwise default to 6.
    console.log("Session start week:", sessionstartweek, "Mode:", mode, "Day List:", dayList, "Base Type:", baseType, "Target Count:", targetCount, "Session Type:", event.sessiontype);
    const useOccurrenceLabel = baseType === "NPT" || baseType === "PT";
    const eventColor = eventColorForType(baseType);

    // Ignore invalid entries or events that start after they end.
    if (!dayList.length || startDate > endDate) {
      return;
    }

    // Keep the pattern aligned to the first matching weekday.
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    let effectiveSessionStartDate = new Date(startDate); // Start with the event's start date, but may adjust to the first Monday of the month if needed.
    //console.log("monthStart", monthStart, "effectiveSessionStartDate", effectiveSessionStartDate, "dayList", dayList);


    // If the month doesn't start on a Monday, find the first Monday and use that as the effective start date.
    if (monthStart.getDay() !== 1) {
      const firstMonday = firstWeekdayOnOrAfter(monthStart, 1);
      if (firstMonday > effectiveSessionStartDate) {
        effectiveSessionStartDate = firstMonday;
      }
    }

    if (effectiveSessionStartDate > endDate) {
      return;
    }

    // Find the first day in the pattern that matches the event days using first monday of the month stored in effectiveSessionStartDate.
    const anchorWeekday = dayList[0];
    const firstEventDate = firstWeekdayOnOrAfter(effectiveSessionStartDate, anchorWeekday);
    //console.log("firstEventDate", firstEventDate, "anchorWeekday", anchorWeekday, "effectiveSessionStartDate", effectiveSessionStartDate);

    // If the first event date is after the end date, skip this event entirely.
    if (firstEventDate > endDate) {
      return;
    }

    // Example: "Every Monday/Wednesday" or "Alternate Week2". For 
    // const alternateweekOffset = sessionstartweek + 1; // Track the offset for alternate week scheduling. If sessionstartweek is 0, it means the first week of the month, so we add 1 to align with the week index calculation.
    const hasTargetCount = Number.isInteger(targetCount) && targetCount > 0;
    let maxBlockGenerated = 0;
    // Safety limit to prevent infinite loops in case of misconfigured repetition rules.
    let iterations = 0;

    // Walk forward day by day and create entries only on matching weekdays.
    // Stop early if the end date, target count, or safety limit is reached.
    for (let currentDate = new Date(firstEventDate); iterations < MAX_EXTENSION_DAYS; currentDate.setDate(currentDate.getDate() + 1), iterations++) {
      const reachedEndDate = currentDate > endDate; // Stop if we've gone past the event's end date.
      // Stop if we've generated enough blocks to satisfy the target count.
      if (/*reachedEndDate*/ !hasTargetCount) {
        break;
      }

      // Stop if we've generated enough blocks to satisfy the target counts for the session. like - 12, 6, 3, 2, 1 etc. depending on the session type.
      if (hasTargetCount && maxBlockGenerated >= targetCount) {
        break;
      }

      // Skip days that don't match the specified weekdays for the event.
      const weekday = currentDate.getDay();
      if (!dayList.includes(weekday)) {
        continue;
      }

      // Calculate the week index relative to the first event date, then determine the block number based on the repetition mode.
      // Means indexing weeks starting from the first event date i.e. First monday of the session starting month like September, May and January, where the first week is index 0, the second week is index 1, and so on.
      const weekIndex = Math.floor((currentDate - effectiveSessionStartDate) / (7 * MS_IN_DAY));
      let weekIndexcount = 0;
      // Calculate the week index relative to the first Monday of the session.
      //const weekIndexfromfirstmonday = Math.floor((currentDate - effectiveSessionStartDate) / (7 * MS_IN_DAY));
      // Determine the block number based on the repetition mode and week index.
      // Block number counts the occurrences of the event, starting from 1 for the first occurrence, 2 for the second occurrence, and so on.
      console.log("weekindex", weekIndex, "weekIndexfromfirstmonday", weekIndexfromfirstmonday, "weekIndexcount", weekIndexcount);
      let blockNumber = 0; // Counting session occurances weekwise


      if (mode === "Every") {
        if (weekIndex >= 0) {
          
        }
        if (weekIndex === targetCount) {
          break;
        }
      };
      for (let i = 0; i <= weekIndex; i++) {
        if (mode === "Every") {
          weekIndexcount++;
        }
        else if (mode === "Alternate") {
          if (i % 2 === 0) {
            weekIndexcount++;
          }
        }
      };



      maxBlockGenerated = Math.max(maxBlockGenerated, targetCount);
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const dynamicSlotName = isWeekend ? "Slot-B" : "Slot-A";
      const displaySessionType = useOccurrenceLabel
        ? `${baseType}-${weekIndexcount} (${dynamicSlotName})`
        : event.sessiontype;

      const key = dateKey(currentDate);
      const record = {
        date: key,
        event,
        eventColor,
        occurrenceCount: weekIndexcount,
        displaySessionType,
      };

      eventTable.push(record);

      if (!eventsByDate.has(key)) {
        eventsByDate.set(key, []);
      }

      eventsByDate.get(key).push(record);
    }
  });
}

async function loadEventsOnce() {
  if (cachedEvents.length > 0) {
    return;
  }

  const res = await fetch(`/api/calendar-events/${encodeURIComponent(window.calendarUsername)}`);
  const data = await res.json();
  cachedEvents = Array.isArray(data.events) ? data.events : [];
  buildEventIndex(cachedEvents);
  console.log(`Loaded ${cachedEvents.length} events for user ${window.calendarUsername}`);
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

  daywiseevents.forEach(entry => {
    const event = entry.event;
    previewlist += `<div class="event-item">
                      <div class="event-title" style="border-left: 6px solid ${entry.eventColor}; padding-left: 8px;">${event.coursename} (${event.coursecode}) | ${entry.displaySessionType}</div>
                      <div class="event-details">
                        <p>${event.professorname}</p>
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