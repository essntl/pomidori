
//bunch of variables for DOM elements
const startBtn = document.querySelector(".btn-start");
const resetBtn = document.querySelector(".btn-reset");
const timeMinutes = document.querySelector(".minutes");
const timeSeconds = document.querySelector(".seconds");
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
let initialTimeMinutes = timeMinutes.textContent;
let initialTimeSeconds = timeSeconds.textContent;

// Set initial stroke dasharray and dashoffset for the progress circle
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

//function to set progress of circle
function setProgress(percent) {
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

//main timer function
function appTimer() {
  //check to see if timer is paused or freshly started and set session length accordingly
  let sessionLength = isPaused
    ? remainingTime
    : Number.parseInt(timeMinutes.textContent) * 60 +
      Number.parseInt(timeSeconds.textContent);

  //set total time for progress calculation
  if (totalTime === 0) {
    totalTime = sessionLength;
  }

  isPaused = false;

  if (!state) {
    state = true;
    startBtn.textContent = "Pause";
    //timer loop function
    const updateTimer = () => {
      sessionLength--;
      let minutesLeft = Math.floor(sessionLength / 60);
      let secondsLeft = sessionLength % 60;

      if (secondsLeft < 10) {
        timeSeconds.textContent = "0" + secondsLeft;
      } else {
        timeSeconds.textContent = secondsLeft;
      }
      timeMinutes.textContent = minutesLeft;

      let percentComplete = ((totalTime - sessionLength) / totalTime) * 100;
      setProgress(percentComplete);

      //timer end condition
      if (minutesLeft === 0 && secondsLeft === 0) {
        clearInterval(myInterval);
        state = false;
        startBtn.textContent = "Start";
        timeMinutes.textContent = initialTimeMinutes;
        timeSeconds.textContent = initialTimeSeconds;
        setProgress(0);
      }
      console.log(totalTime);
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
    clearInterval(myInterval);
    state = false;
    isPaused = false;
    remainingTime = 0;
    totalTime = 0;
    setProgress(0);
    timeMinutes.textContent = initialTimeMinutes;
    timeSeconds.textContent = initialTimeSeconds;
    startBtn.textContent = "Start";
}
//i think this is self explanatory
startBtn.addEventListener("click", appTimer);
resetBtn.addEventListener("click", resetTimer);
