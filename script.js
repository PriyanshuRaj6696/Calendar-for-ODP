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

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

let clickedDay = null;
let selectedDayElement = null;
let previewlist = ""  /** Stores previews */




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

    lit += `<li class="${isToday} ${highlightClass}" data-day="${i}">${i}</li>`;
  }


  /* ---- next month ---- */
  for (let i = dayend; i < 6; i++) {
    lit += `<li class="inactive">${i - dayend + 1}</li>`;
  }


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
