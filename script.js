import {
  pipeline,
  env
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "Xenova/LaMini-T5-61M";

let generator = null;
let imageData = null;
let talkingByItself = false;
let recognition = null;

const downloadScreen = document.getElementById("downloadScreen");
const app = document.getElementById("app");
const downloadButton = document.getElementById("downloadBrainBtn");
const downloadStatus = document.getElementById("downloadStatus");
const progressBar = document.getElementById("progressBar");

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewContainer =
  document.getElementById("imagePreviewContainer");
const removeImage = document.getElementById("removeImage");

const micButton = document.getElementById("micButton");
const talkButton = document.getElementById("talkButton");
const status = document.getElementById("status");

function addMessage(text, type) {
  const element = document.createElement("div");

  element.className = `message ${type}`;
  element.textContent = text;

  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  return element;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 1;
  speech.pitch = 1;

  speechSynthesis.speak(speech);
}

async function loadAI() {
  downloadButton.disabled = true;
  downloadStatus.textContent = "Downloading AI brain...";

  try {
    generator = await pipeline(
      "text2text-generation",
      MODEL,
      {
        progress_callback: data => {

          if (
            typeof data.progress === "number" &&
            data.progress >= 0
          ) {
            const percent = Math.min(
              100,
              Math.round(data.progress)
            );

            progressBar.style.width = percent + "%";
            downloadStatus.textContent =
              `Downloading AI brain... ${percent}%`;
          }
        }
      }
    );

    localStorage.setItem("pulseBrainInstalled", "true");

    downloadStatus.textContent = "AI brain ready!";
    progressBar.style.width = "100%";

    setTimeout(() => {
      downloadScreen.classList.add("hidden");
      app.classList.remove("hidden");

      addMessage(
        "I'm ready. What do you want to do?",
        "ai"
      );
    }, 500);

  } catch (error) {

    console.error(error);

    downloadStatus.textContent =
      "Download failed. Check your internet connection and try again.";

    downloadButton.disabled = false;
  }
}

async function answer(message) {

  if (!generator) {
    addMessage(
      "My AI brain isn't loaded yet.",
      "ai"
    );
    return;
  }

  status.textContent = "Thinking...";

  try {

    const prompt =
      `Answer the user naturally and briefly.\nUser: ${message}`;

    const result = await generator(prompt, {
      max_new_tokens: 80,
      temperature: 0.7
    });

    let response =
      result?.[0]?.generated_text || "";

    response = response
      .replace(prompt, "")
      .trim();

    if (!response) {
      response = "I'm not sure how to answer that.";
    }

    addMessage(response, "ai");

    speak(response);

    status.textContent = "";

    return response;

  } catch (error) {

    console.error(error);

    status.textContent = "";

    addMessage(
      "Something went wrong while I was thinking.",
      "ai"
    );
  }
}

async function sendMessage() {

  const message = input.value.trim();

  if (!message && !imageData) return;

  if (message) {
    addMessage(message, "user");
  }

  input.value = "";

  if (imageData) {
    addMessage(
      "[Image attached]",
      "user"
    );

    /*
      The small local model used here is text-only.
      The image is kept available for future vision-model support.
    */
  }

  const responseText =
    message ||
    "What can you tell me about this image?";

  imageData = null;
  imagePreview.src = "";
  imagePreviewContainer.classList.add("hidden");

  await answer(responseText);
}

downloadButton.addEventListener(
  "click",
  loadAI
);

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

imageInput.addEventListener(
  "change",
  event => {

    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

      imageData = reader.result;

      imagePreview.src = imageData;

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

    imageData = null;
    imagePreview.src = "";
    imagePreviewContainer
      .classList
      .add("hidden");

    imageInput.value = "";
  }
);

/* Voice input */

if ("webkitSpeechRecognition" in window ||
    "SpeechRecognition" in window) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();

  recognition.lang = "en-GB";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    micButton.textContent = "🔴";
    status.textContent = "Listening...";
  };

  recognition.onend = () => {
    micButton.textContent = "🎤";
    status.textContent = "";
  };

  recognition.onresult = event => {

    const text =
      event.results[0][0].transcript;

    input.value = text;

    sendMessage();
  };

  recognition.onerror = error => {
    console.error(error);
    status.textContent = "Microphone error.";
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

/* Talk by itself */

talkButton.addEventListener(
  "click",
  () => {

    talkingByItself = !talkingByItself;

    talkButton.classList.toggle(
      "active",
      talkingByItself
    );

    if (talkingByItself) {

      talkButton.textContent =
        "🛑 Stop Talking";

      addMessage(
        "I'll occasionally talk by myself.",
        "ai"
      );

      spontaneousTalk();

    } else {

      talkButton.textContent =
        "🗣️ Talk by Itself";

      speechSynthesis.cancel();
    }
  }
);

async function spontaneousTalk() {

  if (!talkingByItself) return;

  const ideas = [
    "I wonder what's happening around here.",
    "What should we explore next?",
    "I'm still here.",
    "I wonder what the camera would see right now.",
    "Let's go exploring sometime."
  ];

  const text =
    ideas[Math.floor(
      Math.random() * ideas.length
    )];

  addMessage(text, "ai");
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
  Automatically load the brain if it was already
  downloaded and cached by the browser.
*/

async function boot() {

  if (
    localStorage.getItem(
      "pulseBrainInstalled"
    ) === "true"
  ) {

    downloadStatus.textContent =
      "Loading saved AI brain...";

    try {

      generator = await pipeline(
        "text2text-generation",
        MODEL,
        {
          progress_callback: data => {

            if (
              typeof data.progress === "number"
            ) {
              progressBar.style.width =
                Math.round(data.progress) + "%";
            }

          }
        }
      );

      downloadScreen.classList.add("hidden");
      app.classList.remove("hidden");

      addMessage(
        "I'm ready.",
        "ai"
      );

    } catch (error) {

      console.error(error);

      localStorage.removeItem(
        "pulseBrainInstalled"
      );

      downloadStatus.textContent =
        "Please download the AI brain again.";

      downloadButton.disabled = false;
    }

  }

}

boot();
