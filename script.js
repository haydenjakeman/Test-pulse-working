import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "Xenova/LaMini-T5-61M";

// Add your Raspberry Pi address here later.
// Example:
// const ROBOT_URL = "http://192.168.1.25:5000";
const ROBOT_URL = "";

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const form = document.getElementById("chatForm");
const sendButton = document.getElementById("sendButton");

const micButton = document.getElementById("micButton");
const talkButton = document.getElementById("talkButton");

const statusText = document.getElementById("status");

const downloadPanel = document.getElementById("downloadPanel");
const downloadButton = document.getElementById("downloadButton");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const imageInput = document.getElementById("imageInput");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");

let generator = null;
let loading = false;
let talkByItself = false;
let selectedImage = null;


// ===============================
// BASIC UI
// ===============================

function setStatus(text) {
  if (statusText) {
    statusText.textContent = text;
  }
}

function addMessage(who, text, isUser = false) {
  const message = document.createElement("div");

  message.className =
    "message " + (isUser ? "user-message" : "pulse-message");

  const name = document.createElement("strong");
  name.textContent = who;

  const body = document.createElement("span");
  body.textContent = text;

  message.appendChild(name);
  message.appendChild(body);

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;
}


// ===============================
// AI DOWNLOAD / LOADING
// ===============================

async function loadAI() {

  if (generator) {
    return generator;
  }

  if (loading) {
    return null;
  }

  loading = true;

  if (downloadButton) {
    downloadButton.disabled = true;
  }

  setStatus("Downloading AI brain...");

  try {

    generator = await pipeline(
      "text2text-generation",
      MODEL,
      {
        progress_callback: (info) => {

          if (typeof info.progress === "number") {

            const percent = Math.max(
              0,
              Math.min(
                100,
                Math.round(info.progress)
              )
            );

            if (progressBar) {
              progressBar.style.width = percent + "%";
            }

            if (progressText) {
              progressText.textContent =
                `Downloading... ${percent}%`;
            }
          }
        }
      }
    );

    if (progressBar) {
      progressBar.style.width = "100%";
    }

    if (progressText) {
      progressText.textContent = "AI brain ready!";
    }

    if (downloadPanel) {
      downloadPanel.classList.add("hidden");
    }

    setStatus("Ready");

    return generator;

  } catch (error) {

    console.error("AI download error:", error);

    generator = null;

    setStatus("Download failed");

    if (progressText) {
      progressText.textContent =
        "Download failed — check your internet connection and try again.";
    }

    if (downloadButton) {
      downloadButton.disabled = false;
    }

    return null;

  } finally {

    loading = false;
  }
}


// Download button

if (downloadButton) {
  downloadButton.addEventListener(
    "click",
    loadAI
  );
}


// ===============================
// GENERATE AI RESPONSE
// ===============================

async function generateReply(text) {

  const ai = await loadAI();

  if (!ai) {

    return (
      "I couldn't load my AI brain yet. " +
      "Please try downloading it again."
    );
  }

  try {

    const result = await ai(
      text,
      {
        max_new_tokens: 80,
        temperature: 0.7
      }
    );

    const reply =
      result?.[0]?.generated_text?.trim();

    if (reply) {
      return reply;
    }

    return "I don't know what to say yet.";

  } catch (error) {

    console.error("AI error:", error);

    return "Something went wrong while I was thinking.";
  }
}


// ===============================
// ROBOT COMMAND DETECTION
// ===============================

function detectMovement(text) {

  const t = text.toLowerCase();

  if (
    /\bstop\b/.test(t) ||
    /\bhalt\b/.test(t)
  ) {
    return "STOP";
  }

  if (
    /\bforward\b/.test(t) ||
    /\bgo forward\b/.test(t) ||
    /\bmove forward\b/.test(t)
  ) {
    return "FORWARD";
  }

  if (
    /\bbackward\b/.test(t) ||
    /\bbackwards\b/.test(t) ||
    /\bgo back\b/.test(t) ||
    /\bmove back\b/.test(t)
  ) {
    return "BACKWARD";
  }

  if (
    /\bleft\b/.test(t) ||
    /\bturn left\b/.test(t)
  ) {
    return "LEFT";
  }

  if (
    /\bright\b/.test(t) ||
    /\bturn right\b/.test(t)
  ) {
    return "RIGHT";
  }

  return null;
}


// ===============================
// ROBOT MOVEMENT TIME
// ===============================

function getDuration(text) {

  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i
  );

  if (!match) {
    return 1;
  }

  return Math.min(
    10,
    Math.max(
      0.1,
      Number(match[1])
    )
  );
}


// ===============================
// SEND COMMAND TO RASPBERRY PI
// ===============================

async function sendRobotCommand(
  command,
  duration
) {

  // If the Raspberry Pi isn't connected yet,
  // just show the command in the browser console.

  if (!ROBOT_URL) {

    console.log(
      "Robot command:",
      command,
      "Duration:",
      duration,
      "seconds"
    );

    return;
  }

  try {

    await fetch(
      ROBOT_URL + "/robot",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          command: command,
          duration: duration
        })
      }
    );

  } catch (error) {

    console.error(
      "Robot connection failed:",
      error
    );

    addMessage(
      "Pulse",
      "I couldn't connect to the robot."
    );
  }
}


// ===============================
// SEND MESSAGE
// ===============================

async function sendMessage() {

  const text = input.value.trim();

  if (!text) {
    return;
  }

  // Clear input immediately
  input.value = "";

  // Show user's message
  addMessage(
    "You",
    text,
    true
  );

  setStatus("Thinking...");

  if (sendButton) {
    sendButton.disabled = true;
  }


  // Check if the message is a robot command

  const movement =
    detectMovement(text);

  if (movement) {

    const duration =
      getDuration(text);

    await sendRobotCommand(
      movement,
      duration
    );

    addMessage(
      "Pulse",
      `Robot command: ${movement} for ${duration} second${duration === 1 ? "" : "s"}.`
    );

    setStatus("Ready");

    if (sendButton) {
      sendButton.disabled = false;
    }

    return;
  }


  // Normal AI response

  const reply =
    await generateReply(text);

  addMessage(
    "Pulse",
    reply
  );

  speak(reply);

  setStatus("Ready");

  if (sendButton) {
    sendButton.disabled = false;
  }
}


// ===============================
// SEND BUTTON / ENTER KEY
// ===============================

if (form) {

  form.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      sendMessage();
    }
  );
}


// ===============================
// MICROPHONE
// ===============================

if (micButton) {

  micButton.addEventListener(
    "click",
    () => {

      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      if (!SpeechRecognition) {

        addMessage(
          "Pulse",
          "Voice input isn't supported by this browser."
        );

        return;
      }

      const recognition =
        new SpeechRecognition();

      recognition.lang = "en-GB";

      recognition.interimResults = false;

      recognition.maxAlternatives = 1;

      micButton.textContent = "⏺️";

      setStatus("Listening...");


      recognition.onresult =
        (event) => {

          const spokenText =
            event.results[0][0].transcript;

          input.value =
            spokenText;

          sendMessage();
        };


      recognition.onerror =
        () => {

          micButton.textContent = "🎤";

          setStatus("Ready");
        };


      recognition.onend =
        () => {

          micButton.textContent = "🎤";

          setStatus("Ready");
        };


      recognition.start();
    }
  );
}


// ===============================
// TEXT TO SPEECH
// ===============================

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "en-GB";

  utterance.rate = 1;

  utterance.pitch = 1;

  window.speechSynthesis.speak(
    utterance
  );
}


// ===============================
// TALK BY ITSELF
// ===============================

if (talkButton) {

  talkButton.addEventListener(
    "click",
    () => {

      talkByItself =
        !talkByItself;

      if (talkByItself) {

        talkButton.textContent =
          "Stop Talking";

        addMessage(
          "Pulse",
          "I'll occasionally talk by myself."
        );

        spontaneousTalk();

      } else {

        talkButton.textContent =
          "Talk by Itself";

        addMessage(
          "Pulse",
          "Okay, I'll stay quiet."
        );
      }
    }
  );
}


function spontaneousTalk() {

  if (!talkByItself) {
    return;
  }

  const thoughts = [

    "Hey, I'm still here.",

    "I wonder what we should build next.",

    "That was a quiet moment.",

    "I'm ready if you want to talk.",

    "I was just thinking about the robot.",

    "What should we make next?"
  ];


  const thought =
    thoughts[
      Math.floor(
        Math.random() *
        thoughts.length
      )
    ];


  addMessage(
    "Pulse",
    thought
  );

  speak(thought);


  const delay =
    15000 +
    Math.random() * 30000;


  setTimeout(
    spontaneousTalk,
    delay
  );
}


// ===============================
// IMAGE INPUT
// ===============================

if (imageInput) {

  imageInput.addEventListener(
    "change",
    () => {

      const file =
        imageInput.files?.[0];

      if (!file) {
        return;
      }

      selectedImage =
        file;


      const url =
        URL.createObjectURL(file);


      imagePreview.src =
        url;


      imagePreviewWrap.classList.remove(
        "hidden"
      );


      addMessage(
        "Pulse",
        "I received the picture. This small AI model can preview the image, but it isn't a vision model yet."
      );
    }
  );
}


// ===============================
// STARTUP
// ===============================

setStatus("Ready");

console.log("Pulse loaded successfully.");
