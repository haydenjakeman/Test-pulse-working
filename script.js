import { pipeline, env } from
"https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

// Small browser-friendly model
const MODEL =
    "onnx-community/SmolLM2-135M-ONNX";

let ai = null;
let loading = false;
let talking = false;


// ===============================
// ELEMENTS
// ===============================

const downloadButton =
    document.getElementById("downloadButton");

const downloadPanel =
    document.getElementById("downloadPanel");

const progressBar =
    document.getElementById("progressBar");

const progressText =
    document.getElementById("progressText");

const status =
    document.getElementById("status");

const chat =
    document.getElementById("chat");

const input =
    document.getElementById("messageInput");

const form =
    document.getElementById("chatForm");

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

const imagePreviewWrap =
    document.getElementById("imagePreviewWrap");


// ===============================
// STATUS
// ===============================

function setStatus(text) {
    if (status) {
        status.textContent = text;
    }
}


// ===============================
// CHAT MESSAGE
// ===============================

function addMessage(name, text, user = false) {

    const message =
        document.createElement("div");

    message.className =
        user
            ? "message user-message"
            : "message pulse-message";

    const title =
        document.createElement("strong");

    title.textContent = name;

    const body =
        document.createElement("span");

    body.textContent = text;

    message.appendChild(title);
    message.appendChild(body);

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;
}


// ===============================
// DOWNLOAD AI
// ===============================

async function downloadAI() {

    if (loading) return;

    if (ai) {

        addMessage(
            "Pulse",
            "My AI brain is already loaded."
        );

        return;
    }

    loading = true;

    downloadButton.disabled = true;

    downloadButton.textContent =
        "Downloading...";

    progressText.textContent =
        "Connecting to AI...";

    progressBar.style.width =
        "1%";

    setStatus(
        "Downloading AI..."
    );

    try {

        console.log(
            "Pulse: starting model download"
        );


        // Try WebGPU first because it can be
        // much faster on supported phones.

        let device =
            "wasm";

        if (
            "gpu" in navigator
        ) {
            device =
                "webgpu";
        }


        console.log(
            "Pulse device:",
            device
        );


        const options = {

            device: device,

            dtype: "q8",

            progress_callback:
                function(info) {

                    console.log(
                        "Model download:",
                        info
                    );

                    if (
                        typeof info.progress ===
                        "number"
                    ) {

                        const percent =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Math.round(
                                        info.progress
                                    )
                                )
                            );

                        progressBar.style.width =
                            percent + "%";

                        progressText.textContent =
                            `Downloading AI... ${percent}%`;
                    }
                }
        };


        ai = await pipeline(
            "text-generation",
            MODEL,
            options
        );


        // SUCCESS

        progressBar.style.width =
            "100%";

        progressText.textContent =
            "AI brain ready!";

        downloadButton.textContent =
            "AI Brain Ready";

        setStatus(
            "AI Ready"
        );

        addMessage(
            "Pulse",
            "I'm ready! My AI brain has loaded."
        );


        setTimeout(
            function() {

                if (downloadPanel) {

                    downloadPanel.classList.add(
                        "hidden"
                    );
                }

            },
            1000
        );


    } catch (error) {

        console.error(
            "Pulse AI error:",
            error
        );

        ai = null;

        downloadButton.disabled =
            false;

        downloadButton.textContent =
            "Try Again";

        progressBar.style.width =
            "0%";

        progressText.textContent =
            "The AI couldn't load. Trying the basic browser mode next time.";

        setStatus(
            "AI failed to load"
        );

    } finally {

        loading = false;
    }
}


// ===============================
// DOWNLOAD BUTTON
// ===============================

if (downloadButton) {

    downloadButton.addEventListener(
        "click",
        downloadAI
    );

}


// ===============================
// AI RESPONSE
// ===============================

async function generateReply(text) {

    if (!ai) {

        await downloadAI();
    }

    if (!ai) {

        return "My AI brain isn't loaded yet.";
    }


    try {

        const prompt =
            `You are Pulse, a friendly AI assistant.
Answer the user's message clearly and briefly.

User: ${text}
Pulse:`;


        const result =
            await ai(
                prompt,
                {
                    max_new_tokens: 80,

                    temperature: 0.7,

                    do_sample: true
                }
            );


        let reply =
            result?.[0]?.generated_text || "";


        // Remove the prompt from the response
        if (
            reply.startsWith(prompt)
        ) {

            reply =
                reply.substring(
                    prompt.length
                );
        }


        reply =
            reply.trim();


        if (!reply) {

            return "I'm not sure what to say.";
        }


        return reply;


    } catch (error) {

        console.error(
            "Generation error:",
            error
        );

        return "Something went wrong while I was thinking.";
    }
}


// ===============================
// SEND MESSAGE
// ===============================

async function sendMessage() {

    const text =
        input.value.trim();

    if (!text) return;

    input.value = "";

    addMessage(
        "You",
        text,
        true
    );

    setStatus(
        "Thinking..."
    );

    sendButton.disabled =
        true;


    const reply =
        await generateReply(text);


    addMessage(
        "Pulse",
        reply
    );

    speak(reply);

    setStatus(
        "Ready"
    );

    sendButton.disabled =
        false;
}


// ===============================
// CHAT FORM
// ===============================

if (form) {

    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            sendMessage();
        }
    );
}


// ===============================
// SPEECH
// ===============================

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    window.speechSynthesis.cancel();

    const voice =
        new SpeechSynthesisUtterance(
            text
        );

    voice.lang =
        "en-GB";

    voice.rate =
        1;

    voice.pitch =
        1;

    window.speechSynthesis.speak(
        voice
    );
}


// ===============================
// MICROPHONE
// ===============================

if (micButton) {

    micButton.addEventListener(
        "click",
        function() {

            const Recognition =
                window.SpeechRecognition ||
                window.webkitSpeechRecognition;

            if (!Recognition) {

                addMessage(
                    "Pulse",
                    "Voice input isn't supported here."
                );

                return;
            }


            const recognition =
                new Recognition();

            recognition.lang =
                "en-GB";

            recognition.interimResults =
                false;


            micButton.textContent =
                "🔴";

            setStatus(
                "Listening..."
            );


            recognition.onresult =
                function(event) {

                    input.value =
                        event.results[0][0]
                            .transcript;

                    sendMessage();
                };


            recognition.onend =
                function() {

                    micButton.textContent =
                        "🎤";

                    setStatus(
                        "Ready"
                    );
                };


            recognition.onerror =
                function() {

                    micButton.textContent =
                        "🎤";

                    setStatus(
                        "Ready"
                    );
                };


            recognition.start();

        }
    );
}


// ===============================
// TALK BY ITSELF
// ===============================

if (talkButton) {

    talkButton.addEventListener(
        "click",
        function() {

            talking =
                !talking;

            if (talking) {

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

    if (!talking) return;

    const thoughts = [

        "Hey, I'm still here.",

        "What should we build next?",

        "I was thinking about the robot.",

        "I'm ready if you want to talk."

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


    setTimeout(
        spontaneousTalk,
        15000 +
        Math.random() * 30000
    );
}


// ===============================
// IMAGE
// ===============================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        function() {

            const file =
                imageInput.files?.[0];

            if (!file) return;

            imagePreview.src =
                URL.createObjectURL(
                    file
                );

            imagePreviewWrap.classList.remove(
                "hidden"
            );

            addMessage(
                "Pulse",
                "I received the picture. The current model can display images but doesn't understand them yet."
            );
        }
    );
}


// ===============================
// START
// ===============================

setStatus("Ready");

console.log(
    "PULSE LOADED"
);
