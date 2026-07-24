const INITIAL_DEBT = 300000000; 
const DAILY_RATE = 3450000; 
const NEXT_MILESTONE_TARGET = 200000000; 

// Initial Anchor Constraints: Start from July 15, 2026
const START_YEAR = 2026;
const START_MONTH = 6; // July (0-indexed)
const START_DAY = 15; 

// Current Viewing State
let currentYear = 2026;
let currentMonth = 6; 

// Storage Helper: Formats key like "YYYY-MM-DD"
function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Load saved checked dates from browser localStorage
function loadSavedDays() {
  const saved = localStorage.getItem("debt_tracker_checked_keys");
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }
  // Default active days (July 15–24, 2026 workdays)
  return new Set([15, 16, 17, 20, 21, 22, 23, 24].map(d => formatDateKey(2026, 6, d)));
}

let checkedKeys = loadSavedDays();

function saveDays() {
  localStorage.setItem("debt_tracker_checked_keys", JSON.stringify(Array.from(checkedKeys)));
}

const gridEl = document.getElementById("calendar-grid");
const titleEl = document.getElementById("calendar-title");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

function renderCalendar() {
  gridEl.innerHTML = "";

  // Set Carousel Header Text
  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  titleEl.textContent = `${monthName} ${currentYear}`;

  // Disable Prev button if at starting month (July 2026)
  prevBtn.disabled = (currentYear === START_YEAR && currentMonth === START_MONTH);

  // Weekday Headers (Mon - Sun)
  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const padding = (firstDayIndex + 6) % 7; 

  // Padding tiles for alignment
  for (let i = 0; i < padding; i++) {
    gridEl.appendChild(document.createElement("div"));
  }

  // Generate Month Days
  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    
    // Check if day is prior to start anchor date (July 15, 2026)
    const isBeforeStart = currentYear === START_YEAR && currentMonth === START_MONTH && day < START_DAY;
    const isDisabled = isBeforeStart || isWeekend;

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

      const dateKey = formatDateKey(currentYear, currentMonth, day);

      if (checkedKeys.has(dateKey)) {
        tile.classList.add("checked");
      } else {
        tile.classList.add("unchecked");
      }

      tile.addEventListener("click", () => {
        if (checkedKeys.has(dateKey)) {
          checkedKeys.delete(dateKey);
          tile.classList.remove("checked");
          tile.classList.add("unchecked");
        } else {
          checkedKeys.add(dateKey);
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

// Navigation Handlers
prevBtn.addEventListener("click", () => {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear--;
  } else {
    currentMonth--;
  }
  renderCalendar();
});

nextBtn.addEventListener("click", () => {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear++;
  } else {
    currentMonth++;
  }
  renderCalendar();
});

function calculateStreak() {
  let streak = 0;
  let checkDate = new Date(2026, 6, 24); // Reference anchor date

  while (true) {
    const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth();
    const day = checkDate.getDate();

    if (year < START_YEAR || (year === START_YEAR && month === START_MONTH && day < START_DAY)) {
      break;
    }

    if (!isWeekend) {
      const dateKey = formatDateKey(year, month, day);
      if (checkedKeys.has(dateKey)) {
        streak++;
      } else if (streak > 0) {
        break; // Streak broke
      }
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function calculateProjectedDate(remainingAmount) {
  const workdaysNeeded = Math.ceil(remainingAmount / DAILY_RATE);
  let currentDate = new Date(2026, 6, 24);
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
  const totalDaysChecked = checkedKeys.size;
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
