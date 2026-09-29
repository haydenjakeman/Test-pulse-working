# Pulse AI

Pulse is a browser-based AI assistant designed to run on GitHub Pages.

## Features

- Local AI model
- No OpenAI API key required
- AI brain download button
- Browser caching
- Text chat
- Voice input
- Voice output
- Camera/image selection
- Talk by Itself mode
- Mobile-friendly interface

## Files

- index.html
- style.css
- script.js
- README.md

## Running Pulse

Upload all files to a GitHub repository.

Then enable GitHub Pages:

Settings → Pages → Deploy from branch → main → /root

Open the generated GitHub Pages website.

## Important

The AI model is downloaded the first time Pulse is used.

The browser may store the model locally so it doesn't have to download it every time.

The AI model used in this version is:

Xenova/LaMini-T5-61M

It is deliberately small so that Pulse can run in a browser without an API key.

## Limitations

The included model is small and therefore isn't as capable as large cloud AI systems.

The image button currently previews an image but does not perform true image understanding.

A future version can replace the text model with a vision-language model.
