const storageKey = "emergencyContacts";
const statusEl = document.getElementById("status");
const sosBtn = document.getElementById("sosBtn");
const alarmBtn = document.getElementById("alarmBtn");
const contactForm = document.getElementById("contactForm");
const contactInputs = Array.from(
  document.querySelectorAll("[data-contact-input]")
);
const contactStatus = document.getElementById("contactStatus");
const pickContactButtons = Array.from(
  document.querySelectorAll("[data-pick-contact]")
);
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

const getSavedContacts = () => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveContacts = (values) => {
  localStorage.setItem(storageKey, JSON.stringify(values));
};

if (contactForm && contactInputs.length) {
  const savedContacts = getSavedContacts();
  contactInputs.forEach((input, index) => {
    if (savedContacts[index]) {
      input.value = savedContacts[index];
    }
  });

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = contactInputs.map((input) => input.value.trim());

    if (values.some((value) => !value)) {
      contactStatus.textContent = "Please enter all 5 phone numbers.";
      contactStatus.style.color = "#ff8b9b";
      return;
    }

    const invalidIndex = values.findIndex((value) => {
      const digitsOnly = value.replace(/\D/g, "");
      return digitsOnly.length !== 10;
    });

    if (invalidIndex !== -1) {
      contactStatus.textContent = `Contact ${invalidIndex + 1} must be a 10-digit mobile number.`;
      contactStatus.style.color = "#ff8b9b";
      return;
    }

    saveContacts(values);
    contactStatus.textContent = "Saved all emergency contacts.";
    contactStatus.style.color = "#33d17a";
  });
}

if (pickContactButtons.length && contactInputs.length) {
  pickContactButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!("contacts" in navigator) || !navigator.contacts.select) {
        contactStatus.textContent =
          "Contact picker not supported on this device/browser.";
        contactStatus.style.color = "#ff8b9b";
        return;
      }

      const index = Number(button.dataset.pickContact);
      const targetInput = contactInputs[index];
      if (!targetInput) return;

      try {
        const contacts = await navigator.contacts.select(["tel"], {
          multiple: false,
        });
        const picked = contacts && contacts[0] && contacts[0].tel;
        const phone = Array.isArray(picked) ? picked[0] : picked;
        if (phone) {
          targetInput.value = phone;
          contactStatus.textContent = "Contact loaded. Save to confirm.";
          contactStatus.style.color = "#33d17a";
        } else {
          contactStatus.textContent = "No phone number found on contact.";
          contactStatus.style.color = "#ff8b9b";
        }
      } catch (error) {
        contactStatus.textContent = "Contact selection canceled.";
        contactStatus.style.color = "#ff8b9b";
      }
    });
  });
}

warnFileProtocol();

const normalizePhoneNumber = (value) => {
  const cleaned = value.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned.replace(/^\+/, "");
  }
  if (cleaned.startsWith("91") && cleaned.length > 10) {
    return cleaned;
  }
  return `91${cleaned}`;
};

const buildWhatsappUrl = (number, message) => {
  const encoded = encodeURIComponent(message);
  const normalized = normalizePhoneNumber(number);
  return `https://wa.me/${normalized}?text=${encoded}`;
};

const openWhatsappWithCoords = (number, lat, lon) => {
  const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
  const message = `\ud83c\udd98 I need help! My current location: ${mapsLink} — Please reach me immediately.`;
  const whatsappURL = buildWhatsappUrl(number, message);
  updateStatus("Opening WhatsApp...");
  window.open(whatsappURL, "_blank");
};

const openWhatsappForContacts = (numbers, lat, lon) => {
  numbers.forEach((number, index) => {
    setTimeout(() => {
      openWhatsappWithCoords(number, lat, lon);
    }, index * 600);
  });
};

const triggerSOS = () => {
  const numbers = getSavedContacts();
  if (!numbers.length) {
    updateStatus("Set emergency contacts before using SOS.", true);
    return;
  }
  if (numbers.length < 5) {
    updateStatus("Please save all 5 emergency contacts.", true);
    return;
  }
  updateStatus("Fetching location...");

  if (!navigator.geolocation) {
    updateStatus("Geolocation not supported on this device.", true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log(position.coords);
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      openWhatsappForContacts(numbers, lat, lon);
    },
    (error) => {
      console.log("Error: ", error);
      const details = error && error.message ? ` (${error.message})` : "";
      updateStatus(
        `Unable to access location. Allow permission and reload.${details}`,
        true
      );
      const useDemo = window.confirm(
        "Location is unavailable. Use a demo location instead?"
      );
      if (useDemo) {
        openWhatsappForContacts(numbers, 28.6139, 77.209);
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

const createAlarm = () => {
  if (alarmContext) return;
  alarmContext = new (window.AudioContext || window.webkitAudioContext)();
  alarmOscillator = alarmContext.createOscillator();
  alarmGain = alarmContext.createGain();
  alarmOscillator.type = "square";
  alarmOscillator.frequency.value = 880;
  alarmGain.gain.value = 0.0001;
  alarmOscillator.connect(alarmGain);
  alarmGain.connect(alarmContext.destination);
  alarmOscillator.start();
};

const startRingtone = () => {
  if (!callBody || ringtoneContext) return;
  ringtoneContext = new (window.AudioContext || window.webkitAudioContext)();
  ringtoneOscillator = ringtoneContext.createOscillator();
  ringtoneGain = ringtoneContext.createGain();
  ringtoneOscillator.type = "square";
  ringtoneOscillator.frequency.value = 960;
  ringtoneGain.gain.value = 0.0;
  ringtoneOscillator.connect(ringtoneGain);
  ringtoneGain.connect(ringtoneContext.destination);
  ringtoneOscillator.start();

  const pulse = () => {
    if (!ringtoneGain || !ringtoneContext) return;
    ringtoneOscillator.frequency.setValueAtTime(
      960,
      ringtoneContext.currentTime
    );
    ringtoneGain.gain.setTargetAtTime(0.3, ringtoneContext.currentTime, 0.03);
    setTimeout(() => {
      if (!ringtoneGain || !ringtoneContext) return;
      ringtoneOscillator.frequency.setValueAtTime(
        760,
        ringtoneContext.currentTime
      );
      ringtoneGain.gain.setTargetAtTime(
        0.0,
        ringtoneContext.currentTime,
        0.05
      );
    }, 320);
  };

  pulse();
  const interval = setInterval(pulse, 900);
  ringtoneOscillator.onended = () => clearInterval(interval);
};


const stopRingtone = () => {
  if (!ringtoneContext || !ringtoneOscillator) return;
  ringtoneOscillator.stop();
  ringtoneContext.close();
  ringtoneContext = null;
  ringtoneOscillator = null;
  ringtoneGain = null;
};

const startAlarm = () => {
  createAlarm();
  if (!alarmGain) return;
  alarmGain.gain.setTargetAtTime(0.35, alarmContext.currentTime, 0.05);
  alarmActive = true;
  alarmBtn.classList.add("is-active");
  alarmBtn.querySelector(".action-card__desc").textContent = "Tap to stop";
};

const stopAlarm = () => {
  if (!alarmGain || !alarmContext) return;
  alarmGain.gain.setTargetAtTime(0.0001, alarmContext.currentTime, 0.05);
  alarmActive = false;
  alarmBtn.classList.remove("is-active");
  alarmBtn.querySelector(".action-card__desc").textContent = "Draw attention";
};

if (sosBtn) {
  sosBtn.addEventListener("click", triggerSOS);
}

if (alarmBtn) {
  alarmBtn.addEventListener("click", () => {
    if (alarmActive) {
      stopAlarm();
      return;
    }
    startAlarm();
  });
}

if (acceptBtn) {
  acceptBtn.addEventListener("click", () => {
    stopRingtone();
    window.location.href = "index.html";
  });
}

if (declineBtn) {
  declineBtn.addEventListener("click", () => {
    stopRingtone();
    window.location.href = "index.html";
  });
}

if (callBody) {
  window.addEventListener("click", startRingtone, { once: true });
}
