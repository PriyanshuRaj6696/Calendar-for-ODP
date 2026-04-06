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
const MAX_EXTENSION_DAYS = 730; // 2 years safety cap for target-count extensions

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
  const weekPart = parts[2] || "Week1";

  const dayList = dayPart
    .split(",")
    .map(v => parseInt(v, 10))
    .filter(v => !Number.isNaN(v));

  return { mode, dayList, weekPart };
}

function firstWeekdayOnOrAfter(startDate, weekday) {
  const delta = (weekday - startDate.getDay() + 7) % 7;
  const dateValue = new Date(startDate);
  dateValue.setDate(dateValue.getDate() + delta);
  return dateValue;
}

function parseSessionType(sessionTypeText) {
  const raw = String(sessionTypeText || "").trim();
  const match = raw.match(/^([A-Za-z]+)(?:-(\d+))?(?:\s*\(([^)]+)\))?$/);

  if (!match) {
    return {
      baseType: (raw || "DEFAULT").toUpperCase(),
      targetCount: null,
      slotName: "",
    };
  }

  return {
    baseType: match[1].toUpperCase(),
    targetCount: match[2] ? Number(match[2]) : null,
    slotName: match[3] ? match[3].trim() : "",
  };
}

function eventColorForType(baseType) {
  return EVENT_COLORS[baseType] || EVENT_COLORS.DEFAULT;
}

function buildEventIndex(events) {
  eventTable = [];
  eventsByDate = new Map();

  events.forEach(event => {
    const startDate = new Date(Number(event.start_year), Number(event.start_month) - 1, Number(event.start_day));
    const endDate = new Date(Number(event.end_year), Number(event.end_month) - 1, Number(event.end_day));
    const { mode, dayList, weekPart } = parseRepetition(event.repetition);
    const { baseType, targetCount, slotName } = parseSessionType(event.sessiontype);
    const useOccurrenceLabel = baseType === "NPT" || baseType === "PT";
    const eventColor = eventColorForType(baseType);

    if (!dayList.length || startDate > endDate) {
      return;
    }

    // If course starting month does not begin on Monday, keep first week empty.
    const monthStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    let effectiveStartDate = new Date(startDate);
    if (monthStartDate.getDay() !== 1) {
      const firstMonday = firstWeekdayOnOrAfter(monthStartDate, 1);
      if (firstMonday > effectiveStartDate) {
        effectiveStartDate = firstMonday;
      }
    }

    if (effectiveStartDate > endDate) {
      return;
    }

    // First element in day list is anchor/starting weekday for this event stream.
    const anchorWeekday = dayList[0];
    const firstAnchorDate = firstWeekdayOnOrAfter(effectiveStartDate, anchorWeekday);
    if (firstAnchorDate > endDate) {
      return;
    }

    const alternateOffset = weekPart === "Week2" || weekPart === "1" ? 1 : 0;
    const hasTargetCount = Number.isInteger(targetCount) && targetCount > 0;
    let maxBlockGenerated = 0;
    let iterations = 0;

    for (let d = new Date(firstAnchorDate); iterations < MAX_EXTENSION_DAYS; d.setDate(d.getDate() + 1), iterations++) {
      const reachedDateLimit = d > endDate;
      if (reachedDateLimit && !hasTargetCount) {
        break;
      }

      if (hasTargetCount && maxBlockGenerated >= targetCount) {
        break;
      }

      const weekday = d.getDay();
      if (!dayList.includes(weekday)) {
        continue;
      }

      const weekIndex = Math.floor((d - firstAnchorDate) / (7 * MS_IN_DAY));
      let blockNumber = 0;

      if (mode === "Alternate") {
        if (weekIndex % 2 !== alternateOffset) {
          continue;
        }

        blockNumber = Math.floor((weekIndex - alternateOffset) / 2) + 1;
      } else if (mode !== "Every") {
        continue;
      } else {
        blockNumber = weekIndex + 1;
      }

      if (blockNumber <= 0) {
        continue;
      }

      if (hasTargetCount && blockNumber > targetCount) {
        break;
      }

      maxBlockGenerated = Math.max(maxBlockGenerated, blockNumber);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dynamicSlotName = isWeekend ? "Slot-B" : "Slot-A";
      const displaySessionType = useOccurrenceLabel
        ? `${baseType}-${blockNumber} (${dynamicSlotName})`
        : event.sessiontype;

      const key = dateKey(d);
      const record = {
        date: key,
        event,
        eventColor,
        occurrenceCount: blockNumber,
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

function getEventDotsMarkup(dayEntries) {
  const eventCount = dayEntries.length;
  if (eventCount <= 0) {
    return "";
  }

  const maxVisibleDots = 3; // Show only one dot for simplicity, can be increased if needed
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


