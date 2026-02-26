const storageKey = "contact1";
const statusEl = document.getElementById("status");
const sosBtn = document.getElementById("sosBtn");
const alarmBtn = document.getElementById("alarmBtn");
const contactForm = document.getElementById("contactForm");
const contactInput = document.getElementById("contact1");
const contactStatus = document.getElementById("contactStatus");
const pickContactBtn = document.getElementById("pickContactBtn");
const acceptBtn = document.getElementById("acceptBtn");
const declineBtn = document.getElementById("declineBtn");
const callBody = document.body.classList.contains("call-body");

let alarmContext = null;
let alarmOscillator = null;
let alarmGain = null;
let alarmActive = false;
let ringtoneContext = null;
let ringtoneOscillator = null;
let ringtoneGain = null;

const updateStatus = (message, isError = false) => {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#ff8b9b" : "#a3adbf";
};

const warnFileProtocol = () => {
  if (window.location.protocol !== "file:") return;
  const warning =
    "Running via file:// keeps pages isolated. Use a local server so contacts persist.";
  if (statusEl) {
    statusEl.textContent = warning;
    statusEl.style.color = "#ff8b9b";
  }
  if (contactStatus) {
    contactStatus.textContent = warning;
    contactStatus.style.color = "#ff8b9b";
  }
};

const getSavedContact = () => localStorage.getItem(storageKey) || "";

const saveContact = (value) => {
  localStorage.setItem(storageKey, value);
};

if (contactForm && contactInput) {
  contactInput.value = getSavedContact();

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = contactInput.value.trim();
    if (!value) {
      contactStatus.textContent = "Please enter a phone number.";
      contactStatus.style.color = "#ff8b9b";
      return;
    }
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      contactStatus.textContent = "Enter a 10-digit mobile number.";
      contactStatus.style.color = "#ff8b9b";
      return;
    }
    saveContact(value);
    contactStatus.textContent = "Saved successfully.";
    contactStatus.style.color = "#33d17a";
  });
}