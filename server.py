from flask import Flask, request, jsonify, send_from_directory, render_template, Response
import os, shutil, mimetypes, uuid, subprocess

app = Flask(__name__)

BASE_DIR = os.path.abspath("storage")
THUMB_DIR = os.path.join(BASE_DIR, ".thumbs")
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)

shared_links = {}

# ---------- SAFE PATH ----------
def safe_path(path):
    path = path.lstrip("/")
    full = os.path.abspath(os.path.join(BASE_DIR, path))
    if not full.startswith(BASE_DIR):
        return BASE_DIR
    return full

# ---------- UI ----------
@app.route("/")
def index():
    return render_template("index.html")

# ---------- LIST ----------
@app.route("/api/list")
def list_files():
    path = request.args.get("path","")
    full = safe_path(path)

    items = []
    for name in os.listdir(full):
        p = os.path.join(full, name)
        items.append({
            "name": name,
            "type": "folder" if os.path.isdir(p) else "file",
            "size": os.path.getsize(p),
            "tags": auto_tags(name)
        })

    return jsonify(items)

# ---------- TAGGING ----------
def auto_tags(name):
    n = name.lower()
    tags = []
    if any(x in n for x in ["movie","video","mp4"]): tags.append("video")
    if any(x in n for x in ["img","photo","png","jpg"]): tags.append("image")
    if any(x in n for x in ["song","mp3"]): tags.append("audio")
    return tags

# ---------- UPLOAD ----------
@app.route("/api/upload", methods=["POST"])
def upload():
    path = request.form.get("path","")
    full = safe_path(path)

    f = request.files["file"]
    f.save(os.path.join(full, f.filename))
    return "ok"

# ---------- DOWNLOAD ----------
@app.route("/api/download")
def download():
    path = request.args.get("path","")
    full = safe_path(path)
    return send_from_directory(os.path.dirname(full), os.path.basename(full), as_attachment=True)

# ---------- STREAM ----------
@app.route("/api/file")
def file():
    path = request.args.get("path","")
    full = safe_path(path)

    if not os.path.exists(full) or os.path.isdir(full):
        return "Not found", 404

    size = os.path.getsize(full)
    range_header = request.headers.get("Range", None)

    mime,_ = mimetypes.guess_type(full)
    if not mime:
        mime = "application/octet-stream"

    def gen(start, length):
        with open(full, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(8192, remaining))
                if not chunk:
                    break
                yield chunk
                remaining -= len(chunk)

    if range_header:
        start = int(range_header.split("=")[1].split("-")[0])
        end = size - 1
        length = end - start + 1

        return Response(gen(start,length), 206, mimetype=mime, headers={
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length)   # 🔥 IMPORTANT FIX
        })

    return Response(gen(0,size), mimetype=mime, headers={
        "Content-Length": str(size)  # 🔥 ALSO REQUIRED
    })

# ---------- THUMBNAIL ----------
@app.route("/api/thumb")
def thumb():
    path = request.args.get("path","")
    full = safe_path(path)

    name = os.path.basename(full)
    thumb_path = os.path.join(THUMB_DIR, name + ".jpg")

    if not os.path.exists(thumb_path):
        subprocess.run([
            "ffmpeg",
            "-i", full,
            "-vf", "select=gt(scene\\,0.4)",
            "-frames:v", "1",
            thumb_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return send_from_directory(THUMB_DIR, name + ".jpg")

app.run(host="0.0.0.0", port=5000, debug=True)