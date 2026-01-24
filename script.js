//bunch of variables for timer
const settingsBtn = document.querySelector(".btn-settings");
const startBtn = document.querySelector(".btn-start");
const resetBtn = document.querySelector(".btn-reset");
const timeHours = document.querySelector(".hours");
const timeMinutes = document.querySelector(".minutes");
const timeSeconds = document.querySelector(".seconds");
const statusIndicator = document.querySelector(".timer-status");
const loopIndicator = document.querySelector(".loop-count");
//timer settings modal variables
const modalOverlay = document.querySelector(".modal-overlay");
const modalSettings = document.querySelector(".modal-settings");
const closeButton = document.querySelector(".close-button");
const saveSettingsButton = document.querySelector(".save-settings");
const workDurationInput = document.querySelector("#work-duration");
const breakDurationInput = document.querySelector("#break-duration");
const loopCountInput = document.querySelector("#loop-count");
//variables for circle progress bar
const circle = document.querySelector(".progress-ring__circle");
const radius = circle.r.baseVal.value;
const circumference = 2 * Math.PI * radius;
//timer state variables
let isPaused = false;
let workMode = true;
let breakMode = false;
let totalTime = 0;
let sessionLength = 0;
let myInterval;
let state = false;
let initialTimeHours = timeHours.textContent;
let initialTimeMinutes = timeMinutes.textContent;
let initialTimeSeconds = timeSeconds.textContent;
let workDuration = 25;
let breakDuration = 5;
let currentLoop = 1;
let totalLoops = 2;
// audio effects for timer interactions
const startSound = new Audio("media/start.mp3");
const resetSound = new Audio("media/reset.mp3");
const timerSound = new Audio("media/timer.mp3");

// Set initial stroke dasharray and dashoffset for the progress circle
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

//function to set progress of circle
function setProgress(percent) {
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

function timerStatus() {
  if (!state && !isPaused) {
    statusIndicator.textContent = "Idle";
  } else if (workMode && !breakMode) {
    statusIndicator.textContent = "Working";
  } else if (isPaused) {
    statusIndicator.textContent = "Paused";
  } else if (breakMode) {
    statusIndicator.textContent = "Break";
    timerSound.play();
  }
}

//change style from idle to running timer.
function styleChange() {
  if (state && !isPaused) {
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
  document.body.style.overflow = "hidden";
}

function closeSettings() {
  modalOverlay.style.display = "none";
  document.body.style.overflow = "";
}

function saveSettings() {
  const work = Number(workDurationInput.value);
  const breakDur = Number(breakDurationInput.value);
  const loops = Number(loopCountInput.value);
  
  if (work < 1 || work > 360 || breakDur < 1 || breakDur > 360 || loops < 1 || loops > 15) {
    alert("Please enter valid work (max 360 min) and break (max 60 min) durations along with a loop count between 1-15.");
    return;
  }
  workDuration = Number.parseInt(workDurationInput.value);
  breakDuration = Number.parseInt(breakDurationInput.value);
  totalLoops = Number.parseInt(loopCountInput.value);
  currentLoop = 1;
  let hours = Math.floor(workDuration / 60);
  let minutes = workDuration % 60;

  timeHours.textContent = hours < 10 ? "0" + hours : hours;
  timeMinutes.textContent = minutes < 10 ? "0" + minutes : minutes;
  timeSeconds.textContent = "00";
  loopIndicator.textContent = "Loop " + currentLoop + "/" + totalLoops;
  initialTimeHours = timeHours.textContent;
  initialTimeMinutes = timeMinutes.textContent;
  initialTimeSeconds = timeSeconds.textContent;

  closeSettings();
}

//main timer function
function appTimer() {
  //check to see if timer is paused or freshly started and set session length accordingly
  if (sessionLength === 0) {
    sessionLength = workDuration * 60;
    startSound.play();
  }

  //set total time for progress calculation
  if (totalTime === 0) {
    totalTime = sessionLength;
  }

  if (isPaused) {
    workMode = true;
  }
  isPaused = false;
  //start the countdown loop
  if (!state) {
    state = true;
    styleChange();
    timerStatus();
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
        if (currentLoop <= totalLoops) {
          if (workMode) {
            workMode = false;
            breakMode = true;
            sessionLength = breakDuration * 60;
            totalTime = sessionLength;
            timerStatus();
            currentLoop++;
          } else {
            loopIndicator.textContent =
              "Loop " + currentLoop + "/" + totalLoops;
            workMode = true;
            breakMode = false;
            sessionLength = workDuration * 60;
            totalTime = sessionLength;
            timerStatus();
          }
        } else {
          clearInterval(myInterval);
          workMode = true;
          state = false;
          startBtn.textContent = "Start";
          timeHours.textContent = initialTimeHours;
          timeMinutes.textContent = initialTimeMinutes;
          timeSeconds.textContent = initialTimeSeconds;
          currentLoop = 1;
          loopIndicator.textContent = "Loop 1/" + totalLoops;
          styleChange();
          setProgress(0);
        }
      }
    };
    myInterval = setInterval(updateTimer, 1000);
  } else {
    //state when timer is paused. Sets button text and sets the pause state
    state = false;
    workMode = false;
    isPaused = true;
    clearInterval(myInterval);
    startBtn.textContent = "Resume";
    timerStatus();
  }
}
//reset button function
function resetTimer() {
  if (state || isPaused) {
    resetSound.play();
    clearInterval(myInterval);
    state = false;
    isPaused = false;
    workMode = true;
    breakMode = false;
    totalTime = 0;
    sessionLength = 0;
    currentLoop = 1;
    styleChange();
    setProgress(0);
    timeHours.textContent = initialTimeHours;
    timeMinutes.textContent = initialTimeMinutes;
    timeSeconds.textContent = initialTimeSeconds;
    startBtn.textContent = "Start";
    timerStatus();
  }
}
//i think this is self explanatory, calls functions for whatever element is clicked
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
