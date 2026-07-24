const INITIAL_DEBT = 300000000; 
const DAILY_RATE = 3450000; 
const NEXT_MILESTONE_TARGET = 200000000; 
const YEAR = 2026;
const MONTH = 6; // July (0-indexed)
const START_DAY = 15; 

// Load saved checked days from browser localStorage
function loadSavedDays() {
  const saved = localStorage.getItem("debt_tracker_checked_days");
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }
  // Default active days (July 15–24 workdays)
  return new Set([15, 16, 17, 20, 21, 22, 23, 24]);
}

let checkedDays = loadSavedDays();

function saveDays() {
  localStorage.setItem("debt_tracker_checked_days", JSON.stringify(Array.from(checkedDays)));
}

const gridEl = document.getElementById("calendar-grid");

function renderCalendar() {
  gridEl.innerHTML = "";

  // Days Header (Mon - Sun)
  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  const firstDayIndex = new Date(YEAR, MONTH, 1).getDay();
  const totalDays = new Date(YEAR, MONTH + 1, 0).getDate();
  const padding = (firstDayIndex + 6) % 7; 

  // Padding tiles for month alignment
  for (let i = 0; i < padding; i++) {
    gridEl.appendChild(document.createElement("div"));
  }

  // Create Day Tiles
  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(YEAR, MONTH, day);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isDisabled = day < START_DAY || isWeekend;

    const tile = document.createElement("div");
    tile.className = "day-tile";

    const numSpan = document.createElement("span");
    numSpan.className = "day-number";
    numSpan.textContent = day;
    tile.appendChild(numSpan);

    if (isDisabled) {
      tile.classList.add("disabled");
    } else {
      const checkSpan = document.createElement("span");
      checkSpan.className = "check-mark";
      checkSpan.textContent = "✓";
      tile.appendChild(checkSpan);

      // Apply initial state color class
      if (checkedDays.has(day)) {
        tile.classList.add("checked");
      } else {
        tile.classList.add("unchecked");
      }

      // Tap/click handler
      tile.addEventListener("click", () => {
        if (checkedDays.has(day)) {
          checkedDays.delete(day);
          tile.classList.remove("checked");
          tile.classList.add("unchecked");
        } else {
          checkedDays.add(day);
          tile.classList.remove("unchecked");
          tile.classList.add("checked");
        }
        saveDays();
        updateTracker();
      });
    }

    gridEl.appendChild(tile);
  }
}

function calculateStreak() {
  let streak = 0;
  for (let day = 31; day >= START_DAY; day--) {
    const dateObj = new Date(YEAR, MONTH, day);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    if (!isWeekend) {
      if (checkedDays.has(day)) {
        streak++;
      } else if (streak > 0) {
        break;
      }
    }
  }
  return streak;
}

function calculateProjectedDate(remainingAmount) {
  const workdaysNeeded = Math.ceil(remainingAmount / DAILY_RATE);
  let currentDate = new Date(YEAR, MONTH, 24);
  let addedDays = 0;

  while (addedDays < workdaysNeeded) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      addedDays++;
    }
  }

  return currentDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function updateTracker() {
  const totalDaysChecked = checkedDays.size;
  const totalEarned = totalDaysChecked * DAILY_RATE;
  const remainingDebt = Math.max(0, INITIAL_DEBT - totalEarned);
  const progressPercent = Math.min(100, Math.round((totalEarned / INITIAL_DEBT) * 100));

  const debtToMilestone = Math.max(0, remainingDebt - (INITIAL_DEBT - NEXT_MILESTONE_TARGET));
  const workdaysToMilestone = Math.ceil(debtToMilestone / DAILY_RATE);

  document.getElementById("remaining-debt").textContent = `${remainingDebt.toLocaleString("vi-VN")} VND`;
  document.getElementById("progress-fill").style.width = `${progressPercent}%`;
  document.getElementById("progress-percent").textContent = `${progressPercent}%`;

  document.getElementById("next-milestone").textContent = `⬇ ${NEXT_MILESTONE_TARGET.toLocaleString("vi-VN")} VND`;
  document.getElementById("workdays-left").textContent = `${workdaysToMilestone} workdays left`;

  document.getElementById("total-earned").textContent = `${(totalEarned / 1000000).toFixed(2)}M`;
  document.getElementById("streak-count").textContent = `🔥 ${calculateStreak()} workdays`;

  document.getElementById("projected-date").textContent = calculateProjectedDate(remainingDebt);
}

renderCalendar();
updateTracker();
