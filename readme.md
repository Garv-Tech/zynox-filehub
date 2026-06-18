# Zynox Filehub

![Python](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square)
![Flask](https://img.shields.io/badge/Flask-Backend-black?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-purple?style=flat-square)

**Local-first file sharing and media streaming — accessible from any device on your network.**
No accounts. No cloud. No internet required. Just run it and open a browser.

---

## What is Zynox Filehub?

A lightweight Flask web app that turns any folder on your machine into a browsable,
streamable file hub. Access it from your phone, tablet, or any browser on the same
network. Upload files by dragging them in. Stream video without downloading it first.

This is v1.0 — the foundation. Security-hardened, stable, and ready to run.

---

## Features

| Feature | Details |
|---|---|
| Media Streaming | Stream video and audio in the browser via HTTP range requests |
| File Browser | Browse folders, click to open files |
| Drag and Drop Upload | Drop files directly into the browser window |
| Video Hover Preview | Hover over video cards for a scrub preview |
| Context Menu | Right-click any file for quick actions |
| PWA Support | Install on mobile via browser share menu |
| Responsive | Works on desktop and mobile browsers |

---

## Security

This version addresses the following security issues from the original codebase:

- **Path traversal protection** — all file paths validated against storage root
- **Filename sanitization** — `werkzeug.utils.secure_filename` on all uploads
- **Upload size limit** — 10 GB cap via `MAX_CONTENT_LENGTH`
- **Debug mode disabled** — no stack traces exposed on LAN
- **URL encoding** — all file paths encoded before use in URLs
- **Manifest fix** — PWA manifest filename corrected (`mainfest.json` typo fixed)

---

## Project Structure

```
zynox-filehub/
├── server.py           # Flask backend — all API routes
├── manifest.json       # PWA manifest
├── requirements.txt    # Python dependencies
├── LICENSE
├── static/
│   ├── app.js          # Frontend logic
│   └── style.css       # Styles
└── templates/
    └── index.html      # Main UI
```

---

## Setup

**Requirements:** Python 3.8+

```bash
git clone https://github.com/yourusername/zynox-filehub.git
cd zynox-filehub
pip install -r requirements.txt
python server.py
```

Open in your browser:

```
http://localhost:5000
```

From another device on the same network:

```
http://<your-local-ip>:5000
```

Find your local IP:

```bash
ip a          # Linux / macOS
ipconfig      # Windows
```

---

## Usage

1. Open the app in any browser on your network
2. Click folders to navigate, double-click files to open
3. Drag and drop files anywhere to upload
4. Right-click any file for download, delete, rename
5. Hover over video cards for a quick scrub preview

---

## Limitations

- No authentication — anyone on your LAN can access it
- Playback depends on browser codec support (MP4, WebM, MP3 work natively)
- No folder operations — only individual file actions
- Personal and home network use only

---

## License

MIT — do what you want, keep the attribution.

---

## Author

Built by Garv. Started as a personal fix for moving files between devices.
