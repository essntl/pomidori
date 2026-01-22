//bunch of variables for timer
const settingsBtn = document.querySelector(".btn-settings");
const startBtn = document.querySelector(".btn-start");
const resetBtn = document.querySelector(".btn-reset");
const timeHours = document.querySelector(".hours");
const timeMinutes = document.querySelector(".minutes");
const timeSeconds = document.querySelector(".seconds");
//timer settings modal variables
const modalOverlay = document.querySelector(".modal-overlay");
const modalSettings = document.querySelector(".modal-settings");
const closeButton = document.querySelector(".close-button");
const saveSettingsButton = document.querySelector(".save-settings");
const workDurationInput = document.querySelector("#work-duration");
const breakDurationInput = document.querySelector("#break-duration");
//variables for circle progress bar
const circle = document.querySelector(".progress-ring__circle");
const radius = circle.r.baseVal.value;
const circumference = 2 * Math.PI * radius;
//timer state variables
let isPaused = false;
let remainingTime = 0;
let totalTime = 0;
let myInterval;
let state = false;
let initialTimeHours = timeHours.textContent;
let initialTimeMinutes = timeMinutes.textContent;
let initialTimeSeconds = timeSeconds.textContent;
let workDuration = 25;
let breakDuration = 5;

// Set initial stroke dasharray and dashoffset for the progress circle
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

//function to set progress of circle
function setProgress(percent) {
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

function styleChange() {
  if (!state && !isPaused) {
    document.body.classList.add("lit");
    document.querySelector(".flame").classList.add("lit");
  } else {
    document.body.classList.remove("lit");
    document.querySelector(".flame").classList.remove("lit");
  }
}

function openSettings() {
  if (state || isPaused) {
    resetTimer();
  }
  modalOverlay.style.display = "block";
}

function closeSettings() {
  modalOverlay.style.display = "none";
}

function saveSettings() {
  workDuration = Number.parseInt(workDurationInput.value);
  breakDuration = Number.parseInt(breakDurationInput.value);
  if (
    isNaN(workDuration) ||
    workDuration <= 0 ||
    workDuration > 360 ||
    isNaN(breakDuration) ||
    breakDuration <= 0 ||
    breakDuration > 360
  ) {
    alert(
      "Please enter valid work and break durations between 1 and 360 minutes",
    );
    return;
  }

  let hours = Math.floor(workDuration / 60);
  let minutes = workDuration % 60;

  timeHours.textContent = hours < 10 ? "0" + hours : hours;
  timeMinutes.textContent = minutes < 10 ? "0" + minutes : minutes;
  timeSeconds.textContent = "00";
  initialTimeHours = timeHours.textContent;
  initialTimeMinutes = timeMinutes.textContent;
  initialTimeSeconds = timeSeconds.textContent;

  closeSettings();
}

//main timer function
function appTimer() {
  //check to see if timer is paused or freshly started and set session length accordingly
  let sessionLength = isPaused ? remainingTime : workDuration * 60;

  //set total time for progress calculation
  if (totalTime === 0) {
    totalTime = sessionLength;
  }

  isPaused = false;

  if (!state) {
    styleChange();
    state = true;
    startBtn.textContent = "Pause";
    //timer loop function
    const updateTimer = () => {
      sessionLength--;

      let hoursLeft = Math.floor(sessionLength / 3600);
      let minutesLeft = Math.floor((sessionLength % 3600) / 60);
      let secondsLeft = sessionLength % 60;

      timeHours.textContent = hoursLeft < 10 ? "0" + hoursLeft : hoursLeft;
      timeMinutes.textContent =
        minutesLeft < 10 ? "0" + minutesLeft : minutesLeft;
      timeSeconds.textContent =
        secondsLeft < 10 ? "0" + secondsLeft : secondsLeft;

      let percentComplete = ((totalTime - sessionLength) / totalTime) * 100;
      setProgress(percentComplete);

      //timer end condition
      if (minutesLeft === 0 && secondsLeft === 0) {
        clearInterval(myInterval);
        state = false;
        startBtn.textContent = "Start";
        timeHours.textContent = initialTimeHours;
        timeMinutes.textContent = initialTimeMinutes;
        timeSeconds.textContent = initialTimeSeconds;
        setProgress(0);
      }
    };
    myInterval = setInterval(updateTimer, 1000);
  } else {
    //state when timer is paused. Sets button text and saves remaining time
    state = false;
    isPaused = true;
    remainingTime = sessionLength;
    clearInterval(myInterval);
    startBtn.textContent = "Resume";
  }
}
//reset button function
function resetTimer() {
  if (state || isPaused) {
    styleChange();
    clearInterval(myInterval);
    state = false;
    isPaused = false;
    remainingTime = 0;
    totalTime = 0;
    setProgress(0);
    timeHours.textContent = initialTimeHours;
    timeMinutes.textContent = initialTimeMinutes;
    timeSeconds.textContent = initialTimeSeconds;
    startBtn.textContent = "Start";
  }
}
//i think this is self explanatory
startBtn.addEventListener("click", appTimer);
resetBtn.addEventListener("click", resetTimer);
settingsBtn.addEventListener("click", openSettings);
closeButton.addEventListener("click", closeSettings);
saveSettingsButton.addEventListener("click", saveSettings);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    closeSettings();
  }
});
