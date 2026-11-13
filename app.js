// Local Storage Keys
const STORAGE_TASKS_KEY = "scheduler_tasks_list";
const STORAGE_COMPLETED_KEY = "scheduler_completed_keys";

// Constants & Debt Tracker State
const INITIAL_DEBT = 300000000; 
const MILESTONE_STEP = 100000000; // Decrements in 100M chunks

// Dynamic Start Constraint Anchor (Defaults to July 15, 2026)
let calendarStartDate = new Date(2026, 6, 15); // Month is 0-indexed (6 = July)

// Dynamic Viewing State (Defaults to Current Real-World Date)
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth(); 
let selectedColor = "#f97316";

// Selected Date for Filter (null = default "Today & Overdue")
let selectedDate = null;

let monthlySalary = loadMonthlySalary();

function loadMonthlySalary() {
  const saved = localStorage.getItem("debt_tracker_monthly_salary");
  return saved ? parseFloat(saved) : 76000000;
}

function saveMonthlySalary(amount) {
  localStorage.setItem("debt_tracker_monthly_salary", amount);
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_TASKS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse tasks", e);
    }
  }
  return [];
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
}

function loadCompletedKeys() {
  const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse completion records", e);
    }
  }
  return new Set();
}

function saveCompletedKeys(completedSet) {
  localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(Array.from(completedSet)));
}

let tasks = loadTasks();
let completedKeys = loadCompletedKeys();

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
  return new Set([15, 16, 17, 20, 21, 22, 23, 24].map(d => formatDateKey(2026, 6, d)));
}

let checkedKeys = loadSavedDays();

function saveDays() {
  localStorage.setItem("debt_tracker_checked_keys", JSON.stringify(Array.from(checkedKeys)));
}

function getWorkdaysInMonth(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  let workdays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = new Date(year, month, day).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays++;
    }
  }
  return workdays;
}

function getDailyRateForMonth(year, month) {
  const workdays = getWorkdaysInMonth(year, month);
  return workdays > 0 ? monthlySalary / workdays : 0;
}

function isTaskDueOnDate(task, dateObj) {
  if (!task.startDate) return false;

  const targetKey = formatDateKey(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  );

  const interval = Number(task.intervalDays);

  if (interval === 0 || isNaN(interval)) {
    return task.startDate === targetKey;
  }

  const [startYear, startMonth, startDay] = task.startDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

  if (target < start) return false;

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays % interval === 0;
}

function getTasksForDate(dateObj) {
  return tasks.filter(task => isTaskDueOnDate(task, dateObj));
}

function renderCalendar() {
  const gridEl = document.getElementById("calendar-grid");
  const titleEl = document.getElementById("calendar-title");
  const subtitleEl = document.getElementById("month-rate-subtitle");
  const prevBtn = document.getElementById("prev-month");

  if (!gridEl || !titleEl) return;

  gridEl.innerHTML = "";

  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  titleEl.textContent = `${monthName} ${currentYear}`;

  const workdays = getWorkdaysInMonth(currentYear, currentMonth);
  const dailyRate = getDailyRateForMonth(currentYear, currentMonth);
  if (subtitleEl) {
    const rateInMillions = (dailyRate / 1000000).toFixed(1);
    subtitleEl.textContent = `${rateInMillions}M/day (${workdays} days)`;
  }

  const startYearThreshold = calendarStartDate.getFullYear();
  const startMonthThreshold = calendarStartDate.getMonth();

  if (prevBtn) {
    prevBtn.disabled = (currentYear === startYearThreshold && currentMonth === startMonthThreshold);
  }

  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const padding = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < padding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dateKeyStr = formatDateKey(currentYear, currentMonth, day);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    
    // Check if tile is before dynamic calendarStartDate
    const isBeforeStart = dayDate < calendarStartDate;
    const isDisabled = isBeforeStart || isWeekend;

    const tile = document.createElement("div");

    if (isDisabled) {
      tile.className = "day-tile disabled";
    } else {
      tile.className = "day-tile clickable";
    }

    if (currentYear === todayYear && currentMonth === todayMonth && day === todayDay) {
      tile.classList.add("is-today");
    }

    if (selectedDate && 
        selectedDate.getFullYear() === currentYear && 
        selectedDate.getMonth() === currentMonth && 
        selectedDate.getDate() === day) {
      tile.classList.add("is-selected");
    }

    const numSpan = document.createElement("span");
    numSpan.className = "day-number";
    numSpan.textContent = day;
    tile.appendChild(numSpan);

    const dueTasks = getTasksForDate(dayDate);
    if (dueTasks.length > 0 && !isBeforeStart) {
      tile.classList.add("has-task");
      const indicator = document.createElement("div");
      indicator.className = "task-dots";

      let allDone = true;
      dueTasks.forEach(task => {
        const key = `${task.id}_${dateKeyStr}`;
        if (!completedKeys.has(key)) allDone = false;
      });

      if (allDone) {
        tile.classList.add("all-completed");
      }

      indicator.innerHTML = dueTasks.map(task => {
        const isDone = completedKeys.has(`${task.id}_${dateKeyStr}`);
        const dotColor = isDone ? 'var(--accent-green)' : (task.color || 'var(--accent)');
        return `<span class="dot" style="background-color: ${dotColor};"></span>`;
      }).join('');
      
      tile.appendChild(indicator);
    }

    if (!isDisabled) {
      const checkSpan = document.createElement("span");
      checkSpan.className = "check-mark";
      checkSpan.textContent = "✓";
      tile.appendChild(checkSpan);

      if (checkedKeys.has(dateKeyStr)) {
        tile.classList.add("checked");
      } else {
        tile.classList.add("unchecked");
      }

      tile.addEventListener("click", () => {
        // Toggle selected date filter
        if (selectedDate && 
            selectedDate.getFullYear() === currentYear && 
            selectedDate.getMonth() === currentMonth && 
            selectedDate.getDate() === day) {
          selectedDate = null;
        } else {
          selectedDate = new Date(currentYear, currentMonth, day);
        }

        // Toggle work checkmark
        if (checkedKeys.has(dateKeyStr)) {
          checkedKeys.delete(dateKeyStr);  
          tile.classList.remove("checked");
          tile.classList.add("unchecked");
        } else {
          checkedKeys.add(dateKeyStr);
          tile.classList.remove("unchecked");
          tile.classList.
