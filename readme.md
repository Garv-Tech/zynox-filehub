# Zynox
![Python](https://img.shields.io/badge/Python-3.x-blue)
![Flask](https://img.shields.io/badge/Flask-lightweight-black)
![License](https://img.shields.io/badge/License-MIT-green)

A local-first file server for browsing, sharing, and streaming media across devices on the same network.  
No accounts, no cloud, no internet — just run it and open a browser.

Think of it as a lightweight personal NAS you can spin up in seconds.

---

## Why Zynox?

Most tools either focus on file storage (like Google Drive) or media streaming (like Plex).

Zynox combines both into a simple, local-first system that works instantly across devices without setup or accounts.

---

## Features

- Stream video and audio directly in the browser (no downloads required)
- File explorer with grid view, sidebar, and hover video previews
- Drag-and-drop uploads
- Smart search — type things like "videos" or "images" to filter by type
- Right-click context menu for common actions
- Keyboard shortcuts (Enter to open, Delete to remove)
- Virtual scrolling — handles large folders smoothly
- PWA support — install it on your phone like an app
- Works on desktop and mobile

---

## How It Works

The backend is built with Flask and exposes endpoints for listing files, handling uploads, and streaming media.

Streaming uses HTTP range requests, so seeking and scrubbing work properly instead of reloading the entire file.

The frontend is plain HTML, CSS, and JavaScript — no frameworks. It fetches data from the backend and handles all UI interactions client-side.

If FFmpeg is available, Zynox generates thumbnails for videos. Otherwise, it falls back to a simple preview.

---
## Architecture (Simplified)

- Flask backend serves APIs for files and streaming
- Frontend fetches data and renders UI dynamically
- Media is streamed using HTTP range requests
- Optional FFmpeg generates thumbnails

## Setup

**Requirements:** Python 3.8+, pip  
**Optional:** FFmpeg (for video thumbnails)

```bash
git clone https://github.com/Garv-Tech/zynox-filehub.git
cd zynox
pip install -r requirements.txt
python server.py
```

Open in browser:

```
http://localhost:5000
```

To access from another device on the same network, use your local IP:

```
http://<your-ip>:5000
```

**Find your local IP**

- Linux/macOS: `ip a` or `ifconfig`
- Windows: `ipconfig`

---

## Usage

- Open the app in your browser from any device on the same network
- Click folders to navigate, click files to open or stream
- Drag and drop files anywhere in the window to upload
- Right-click files for actions (download, delete, etc.)
- Use search to filter (e.g., "video", "pdf", "music")
- On mobile, add it to your home screen for a cleaner experience

Streaming works for formats supported by your browser (MP4, WebM, MP3, etc.).

---

## Screenshots

![Main UI](assets/ui.png)
![Playback](assets/playback.png)

---

## Limitations

- No authentication — anyone on the same network can access it
- Streaming depends on browser codec support
- Thumbnail generation requires FFmpeg and may take time for new files
- Not designed for heavy multi-user or production use
- No sync, versioning, or advanced file management

---

## Planned Improvements

- Basic authentication (optional password)
- Transcoding fallback for unsupported formats
- Download entire folders as zip
- Sorting (date, size, type)
- Persistent UI preferences (theme, layout)

---

## License

MIT

---

## Author

Built by Garv.  
Started as a simple way to move files between devices without relying on cloud services.