import {
  pipeline,
  env
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

/*
==================================================
PULSE SETTINGS
==================================================
*/

const MODEL = "Xenova/LaMini-T5-61M";

/*
If the Raspberry Pi is connected to Pulse,
put the Pi's local address here.

Example:

const ROBOT_URL = "http://192.168.1.25:5000";

Leave it empty until the robot is ready.
*/

const ROBOT_URL = "";

/*
==================================================
VARIABLES
==================================================
*/

let ai = null;

let selectedImage = null;

let talkingByItself = false;

let recognition = null;

let conversation = [];

/*
==================================================
ELEMENTS
==================================================
*/

const downloadScreen =
  document.getElementById("downloadScreen");

const app =
  document.getElementById("app");

const downloadBrainBtn =
  document.getElementById("downloadBrainBtn");

const downloadStatus =
  document.getElementById("downloadStatus");

const progressBar =
  document.getElementById("progressBar");

const chat =
  document.getElementById("chat");

const input =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const micButton =
  document.getElementById("micButton");

const talkButton =
  document.getElementById("talkButton");

const imageInput =
  document.getElementById("imageInput");

const imagePreview =
  document.getElementById("imagePreview");

const imagePreviewContainer =
  document.getElementById("imagePreviewContainer");

const removeImage =
  document.getElementById("removeImage");

const status =
  document.getElementById("status");

/*
==================================================
CHAT
==================================================
*/

function addMessage(text, type) {

  const message =
    document.createElement("div");

  message.className =
    "message " + type;

  message.textContent = text;

  chat.appendChild(message);

  chat.scrollTop =
    chat.scrollHeight;

  return message;
}

/*
==================================================
VOICE OUTPUT
==================================================
*/

function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }

  speechSynthesis.cancel();

  const voice =
    new SpeechSynthesisUtterance(text);

  voice.rate = 1;

  voice.pitch = 1;

  speechSynthesis.speak(voice);
}

/*
==================================================
ROBOT COMMANDS
==================================================

The AI is only allowed to request
predefined commands.

It cannot execute arbitrary JavaScript.
*/

const ROBOT_COMMANDS = [

  "FORWARD",

  "BACKWARD",

  "LEFT",

  "RIGHT",

  "STOP"

];

/*
Send a command to the Raspberry Pi.

The Pi will later have a tiny server
that receives these commands.
*/

async function sendRobotCommand(
  command,
  duration = 1
) {

  if (!ROBOT_URL) {

    console.log(
      "Robot command:",
      command,
      duration
    );

    return;
  }

  if (!ROBOT_COMMANDS.includes(command)) {
    return;
  }

  try {

    await fetch(
      ROBOT_URL + "/robot",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          command: command,
          duration: duration
        })
      }
    );

  } catch (error) {

    console.error(
      "Robot connection error:",
      error
    );

    status.textContent =
      "Robot connection failed.";
  }
}

/*
==================================================
UNDERSTAND MOVEMENT
==================================================
*/

function detectMovement(text) {

  const message =
    text.toLowerCase();

  if (
    message.includes("stop") ||
    message.includes("don't move") ||
    message.includes("dont move")
  ) {

    return {
      command: "STOP",
      duration: 0
    };
  }

  if (
    message.includes("forward") ||
    message.includes("go forwards") ||
    message.includes("move ahead")
  ) {

    return {
      command: "FORWARD",
      duration: getDuration(message)
    };
  }

  if (
    message.includes("backward") ||
    message.includes("backwards") ||
    message.includes("reverse")
  ) {

    return {
      command: "BACKWARD",
      duration: getDuration(message)
    };
  }

  if (
    message.includes("turn left") ||
    message.includes("go left")
  ) {

    return {
      command: "LEFT",
      duration: getDuration(message)
    };
  }

  if (
    message.includes("turn right") ||
    message.includes("go right")
  ) {

    return {
      command: "RIGHT",
      duration: getDuration(message)
    };
  }

  return null;
}

function getDuration(text) {

  const match =
    text.match(/(\d+(?:\.\d+)?)\s*(second|seconds|sec|secs)/);

  if (match) {

    const seconds =
      Number(match[1]);

    return Math.min(
      seconds,
      10
    );
  }

  return 1;
}

/*
==================================================
AI
==================================================
*/

async function generateAnswer(text) {

  if (!ai) {

    return "My AI brain isn't loaded yet.";
  }

  status.textContent =
    "Thinking...";

  try {

    const prompt =
      `You are Pulse, a friendly robot AI assistant.

Answer the user naturally and briefly.

User:
${text}

Answer:`;

    const result =
      await ai(
        prompt,
        {
          max_new_tokens: 70,
          temperature: 0.7
        }
      );

    let answer =
      result?.[0]?.generated_text || "";

    answer =
      answer
        .replace(prompt, "")
        .trim();

    if (!answer) {

      answer =
        "I'm not sure how to answer that.";
    }

    return answer;

  } catch (error) {

    console.error(error);

    return "I had trouble thinking about that.";
  }
}

/*
==================================================
SEND MESSAGE
==================================================
*/

async function sendMessage() {

  const text =
    input.value.trim();

  if (!text && !selectedImage) {
    return;
  }

  if (text) {
    addMessage(
      text,
      "user"
    );
  }

  input.value = "";

  /*
  Check whether the user is
  asking the robot to move.
  */

  if (text) {

    const movement =
      detectMovement(text);

    if (movement) {

      await sendRobotCommand(
        movement.command,
        movement.duration
      );

      let movementReply;

      if (movement.command === "STOP") {

        movementReply =
          "Okay, I've stopped.";

      } else {

        movementReply =
          `Okay — moving ${movement.command.toLowerCase()} for ${movement.duration} second${movement.duration === 1 ? "" : "s"}.`;
      }

      addMessage(
        movementReply,
        "ai"
      );

      speak(movementReply);

      status.textContent = "";

      selectedImage = null;

      imagePreviewContainer
        .classList
        .add("hidden");

      return;
    }
  }

  if (selectedImage) {

    addMessage(
      "📷 Image attached",
      "user"
    );

    /*
    The current tiny model is text-only.
    The image is kept ready for a future
    vision model.
    */

    selectedImage = null;

    imagePreviewContainer
      .classList
      .add("hidden");
  }

  const answer =
    await generateAnswer(text);

  conversation.push({
    user: text,
    assistant: answer
  });

  addMessage(
    answer,
    "ai"
  );

  speak(answer);

  status.textContent = "";
}

/*
==================================================
DOWNLOAD AI
==================================================
*/

async function downloadBrain() {

  downloadBrainBtn.disabled = true;

  downloadStatus.textContent =
    "Downloading AI brain...";

  try {

    ai =
      await pipeline(
        "text2text-generation",
        MODEL,
        {
          progress_callback:
            data => {

              if (
                typeof data.progress ===
                "number"
              ) {

                const percentage =
                  Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        data.progress
                      )
                    )
                  );

                progressBar.style.width =
                  percentage + "%";

                downloadStatus.textContent =
                  `Downloading AI brain... ${percentage}%`;
              }
            }
        }
      );

    localStorage.setItem(
      "pulseBrainInstalled",
      "true"
    );

    progressBar.style.width =
      "100%";

    downloadStatus.textContent =
      "AI brain ready!";

    setTimeout(
      openPulse,
      500
    );

  } catch (error) {

    console.error(error);

    downloadStatus.textContent =
      "Download failed. Check your internet connection and try again.";

    downloadBrainBtn.disabled =
      false;
  }
}

downloadBrainBtn.addEventListener(
  "click",
  downloadBrain
);

/*
==================================================
OPEN PULSE
==================================================
*/

function openPulse() {

  downloadScreen
    .classList
    .add("hidden");

  app
    .classList
    .remove("hidden");

  addMessage(
    "I'm ready. What do you want to do?",
    "ai"
  );
}

/*
==================================================
CHECK FOR SAVED AI
==================================================
*/

async function loadSavedBrain() {

  if (
    localStorage.getItem(
      "pulseBrainInstalled"
    ) !== "true"
  ) {

    return;
  }

  downloadStatus.textContent =
    "Loading saved AI brain...";

  try {

    ai =
      await pipeline(
        "text2text-generation",
        MODEL,
        {
          progress_callback:
            data => {

              if (
                typeof data.progress ===
                "number"
              ) {

                progressBar.style.width =
                  Math.round(
                    data.progress
                  ) + "%";
              }
            }
        }
      );

    openPulse();

  } catch (error) {

    console.error(error);

    localStorage.removeItem(
      "pulseBrainInstalled"
    );

    downloadBrainBtn.disabled =
      false;

    downloadStatus.textContent =
      "Please download the AI brain again.";
  }
}

/*
==================================================
TEXT BUTTON
==================================================
*/

sendButton.addEventListener(
  "click",
  sendMessage
);

input.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      sendMessage();
    }

  }
);

/*
==================================================
IMAGE
==================================================
*/

imageInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      () => {

        selectedImage =
          reader.result;

        imagePreview.src =
          selectedImage;

        imagePreviewContainer
          .classList
          .remove("hidden");
      };

    reader.readAsDataURL(file);
  }
);

removeImage.addEventListener(
  "click",
  () => {

    selectedImage =
      null;

    imagePreview.src =
      "";

    imagePreviewContainer
      .classList
      .add("hidden");

    imageInput.value =
      "";
  }
);

/*
==================================================
VOICE INPUT
==================================================
*/

if (
  "SpeechRecognition" in window ||
  "webkitSpeechRecognition" in window
) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  recognition =
    new SpeechRecognition();

  recognition.lang =
    "en-GB";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;

  recognition.onstart =
    () => {

      micButton.textContent =
        "🔴";

      status.textContent =
        "Listening...";
    };

  recognition.onend =
    () => {

      micButton.textContent =
        "🎤";

      status.textContent =
        "";
    };

  recognition.onresult =
    event => {

      const text =
        event.results[0][0]
          .transcript;

      input.value =
        text;

      sendMessage();
    };

  recognition.onerror =
    error => {

      console.error(error);

      status.textContent =
        "Microphone error.";
    };
}

micButton.addEventListener(
  "click",
  () => {

    if (!recognition) {

      status.textContent =
        "Speech recognition isn't supported here.";

      return;
    }

    recognition.start();
  }
);

/*
==================================================
TALK BY ITSELF
==================================================
*/

talkButton.addEventListener(
  "click",
  () => {

    talkingByItself =
      !talkingByItself;

    talkButton
      .classList
      .toggle(
        "active",
        talkingByItself
      );

    if (talkingByItself) {

      talkButton.textContent =
        "🛑 Stop Talking";

      addMessage(
        "I'll talk occasionally by myself.",
        "ai"
      );

      speak(
        "I'll talk occasionally by myself."
      );

      spontaneousTalk();

    } else {

      talkButton.textContent =
        "🗣️ Talk by Itself";

      speechSynthesis.cancel();
    }
  }
);

function spontaneousTalk() {

  if (!talkingByItself) {
    return;
  }

  const thingsToSay = [

    "I wonder what's around here.",

    "What should we explore next?",

    "I'm still here.",

    "I wonder what my camera would see right now.",

    "I think we should go exploring.",

    "This robot thing is pretty cool."

  ];

  const text =
    thingsToSay[
      Math.floor(
        Math.random() *
        thingsToSay.length
      )
    ];

  addMessage(
    text,
    "ai"
  );

  speak(text);

  const delay =
    20000 +
    Math.random() * 40000;

  setTimeout(
    spontaneousTalk,
    delay
  );
}

/*
==================================================
START
==================================================
*/

loadSavedBrain();
