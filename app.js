const INITIAL_DEBT = 300000000; 
const DAILY_RATE = 3450000; 
const NEXT_MILESTONE_TARGET = 200000000; 

// Start Constraint: July 15, 2026
const START_YEAR = 2026;
const START_MONTH = 6; // July (0-indexed)
const START_DAY = 15; 

// Current Viewing State
let currentYear = 2026;
let currentMonth = 6; 

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function loadSavedDays() {
  const saved = localStorage.getItem("debt_tracker_checked_keys");
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }
  // Initial default workdays (July 15–24, 2026)
  return new Set([15, 16, 17, 20, 21, 22, 23, 24].map(d => formatDateKey(2026, 6, d)));
}

let checkedKeys = loadSavedDays();

function saveDays() {
  localStorage.setItem("debt_tracker_checked_keys", JSON.stringify(Array.from(checkedKeys)));
}

function renderCalendar() {
  const gridEl = document.getElementById("calendar-grid");
  const titleEl = document.getElementById("calendar-title");
  const prevBtn = document.getElementById("prev-month");

  if (!gridEl || !titleEl) return;

  gridEl.innerHTML = "";

  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  titleEl.textContent = `${monthName} ${currentYear}`;

  if (prevBtn) {
    prevBtn.disabled = (currentYear === START_YEAR && currentMonth === START_MONTH);
  }

  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const padding = (firstDayIndex + 6) % 7; 

  for (let i = 0; i < padding; i++) {
    gridEl.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
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

function calculateStreak() {
  let streak = 0;
  let checkDate = new Date(2026, 6, 24);

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
        break;
      }
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

// Helper: Projects future date by adding N workdays starting from today/anchor
function projectWorkdaysAhead(workdaysNeeded) {
  let currentDate = new Date(2026, 6, 24); // Reference anchor
  let addedWorkdays = 0;

  if (workdaysNeeded <= 0) {
    return {
      dateString: "Achieved!",
      workdaysCount: 0
    };
  }

  while (addedWorkdays < workdaysNeeded) {
    currentDate.setDate(currentDate.getDate() + 1);
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      addedWorkdays++;
    }
  }

  return {
    dateString: currentDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),
    workdaysCount: workdaysNeeded
  };
}

function updateTracker() {
  const totalDaysChecked = checkedKeys.size;
  const totalEarned = totalDaysChecked * DAILY_RATE;
  const remainingDebt = Math.max(0, INITIAL_DEBT - totalEarned);
  const progressPercent = Math.min(100, Math.round((totalEarned / INITIAL_DEBT) * 100));

  // Milestone Calculations
  const debtToMilestone = Math.max(0, remainingDebt - NEXT_MILESTONE_TARGET);
  const workdaysToMilestone = Math.ceil(debtToMilestone / DAILY_RATE);
  const milestoneProjection = projectWorkdaysAhead(workdaysToMilestone);

  // Total Debt-Free Calculations
  const totalWorkdaysNeeded = Math.ceil(remainingDebt / DAILY_RATE);
  const totalProjection = projectWorkdaysAhead(totalWorkdaysNeeded);

  // DOM Updates
  document.getElementById("remaining-debt").textContent = `${remainingDebt.toLocaleString("vi-VN")} VND`;
  document.getElementById("progress-fill").style.width = `${progressPercent}%`;
  document.getElementById("progress-percent").textContent = `${progressPercent}%`;

  // Milestone updates
  document.getElementById("next-milestone").textContent = `⬇ ${NEXT_MILESTONE_TARGET.toLocaleString("vi-VN")} VND`;
  document.getElementById("milestone-date").textContent = `Target: ${milestoneProjection.dateString}`;
  document.getElementById("workdays-left").textContent = `${milestoneProjection.workdaysCount} workdays to milestone`;

  // General Stats
  document.getElementById("total-earned").textContent = `${(totalEarned / 1000000).toFixed(2)}M`;
  document.getElementById("streak-count").textContent = `🔥 ${calculateStreak()} workdays`;

  // Projected Full Clearance
  document.getElementById("projected-date").textContent = totalProjection.dateString;
  document.getElementById("total-workdays-left").textContent = `${totalProjection.workdaysCount} total workdays remaining`;
}

document.addEventListener("DOMContentLoaded", () => {
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentYear > START_YEAR || (currentYear === START_YEAR && currentMonth > START_MONTH)) {
        if (currentMonth === 0) {
          currentMonth = 11;
          currentYear--;
        } else {
          currentMonth--;
        }
        renderCalendar();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
      } else {
        currentMonth++;
      }
      renderCalendar();
    });
  }

  renderCalendar();
  updateTracker();
});
