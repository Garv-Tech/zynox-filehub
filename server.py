from flask import Flask, request, jsonify, send_from_directory, render_template, Response
import os, shutil, mimetypes, json
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = os.path.abspath("storage")
THUMB_DIR = os.path.join(BASE_DIR, ".thumbs")
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 4 * 1024 * 1024 * 1024  # 4 GB

# ---------- SAFE PATH ----------
def safe_path(path):
    path = (path or "").lstrip("/")
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
    path = request.args.get("path", "")
    full = safe_path(path)

    if not os.path.isdir(full):
        return jsonify({"error": "Not a directory"}), 400

    items = []
    try:
        entries = sorted(os.scandir(full), key=lambda e: (not e.is_dir(), e.name.lower()))
        for entry in entries:
            if entry.name.startswith("."):
                continue
            stat = entry.stat()
            items.append({
                "name": entry.name,
                "type": "folder" if entry.is_dir() else "file",
                "size": stat.st_size,
                "modified": int(stat.st_mtime),
                "ext": "" if entry.is_dir() else os.path.splitext(entry.name)[1].lower().lstrip(".")
            })
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403

    return jsonify(items)

# ---------- UPLOAD ----------
@app.route("/api/upload", methods=["POST"])
def upload():
    path = request.form.get("path", "")
    full = safe_path(path)

    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    f = request.files["file"]
    filename = secure_filename(f.filename)
    if not filename:
        return jsonify({"error": "Invalid filename"}), 400

    save_path = os.path.join(full, filename)
    f.save(save_path)
    stat = os.stat(save_path)
    return jsonify({
        "name": filename,
        "type": "file",
        "size": stat.st_size,
        "modified": int(stat.st_mtime),
        "ext": os.path.splitext(filename)[1].lower().lstrip(".")
    })

# ---------- DOWNLOAD ----------
@app.route("/api/download")
def download():
    path = request.args.get("path", "")
    full = safe_path(path)
    if not os.path.isfile(full):
        return "Not found", 404
    return send_from_directory(os.path.dirname(full), os.path.basename(full), as_attachment=True)

# ---------- DELETE ----------
@app.route("/api/delete", methods=["DELETE"])
def delete():
    path = request.args.get("path", "")
    full = safe_path(path)

    if full == BASE_DIR:
        return jsonify({"error": "Cannot delete root"}), 400
    if not os.path.exists(full):
        return jsonify({"error": "Not found"}), 404

    if os.path.isdir(full):
        shutil.rmtree(full)
    else:
        os.remove(full)
    return jsonify({"ok": True})

# ---------- RENAME ----------
@app.route("/api/rename", methods=["POST"])
def rename():
    data = request.get_json()
    old_path = safe_path(data.get("path", ""))
    new_name = secure_filename(data.get("name", ""))
    if not new_name:
        return jsonify({"error": "Invalid name"}), 400
    new_path = os.path.join(os.path.dirname(old_path), new_name)
    if os.path.exists(new_path):
        return jsonify({"error": "Name already exists"}), 409
    os.rename(old_path, new_path)
    return jsonify({"ok": True, "name": new_name})

# ---------- NEW FOLDER ----------
@app.route("/api/mkdir", methods=["POST"])
def mkdir():
    data = request.get_json()
    path = safe_path(data.get("path", ""))
    name = secure_filename(data.get("name", ""))
    if not name:
        return jsonify({"error": "Invalid name"}), 400
    new_dir = os.path.join(path, name)
    if os.path.exists(new_dir):
        return jsonify({"error": "Already exists"}), 409
    os.makedirs(new_dir)
    stat = os.stat(new_dir)
    return jsonify({
        "name": name,
        "type": "folder",
        "size": 0,
        "modified": int(stat.st_mtime),
        "ext": ""
    })

# ---------- STREAM ----------
@app.route("/api/file")
def file():
    path = request.args.get("path", "")
    full = safe_path(path)

    if not os.path.isfile(full):
        return "Not found", 404

    size = os.path.getsize(full)
    mime, _ = mimetypes.guess_type(full)
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

    range_header = request.headers.get("Range")
    if range_header:
        try:
            start = int(range_header.split("=")[1].split("-")[0])
        except (IndexError, ValueError):
            return "Bad range", 400
        end = size - 1
        length = end - start + 1
        return Response(gen(start, length), 206, mimetype=mime, headers={
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length)
        })

    return Response(gen(0, size), mimetype=mime, headers={
        "Accept-Ranges": "bytes",
        "Content-Length": str(size)
    })

# ---------- THUMBNAIL ----------
@app.route("/api/thumb")
def thumb():
    path = request.args.get("path", "")
    full = safe_path(path)

    if not os.path.isfile(full):
        return "Not found", 404

    name = os.path.basename(full)
    thumb_path = os.path.join(THUMB_DIR, name + ".jpg")

    if not os.path.exists(thumb_path):
        try:
            import subprocess
            subprocess.run([
                "ffmpeg", "-i", full,
                "-vf", "thumbnail,scale=320:180:force_original_aspect_ratio=decrease",
                "-frames:v", "1", thumb_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        except Exception:
            return "No thumbnail", 404

    if not os.path.exists(thumb_path):
        return "No thumbnail", 404

    return send_from_directory(THUMB_DIR, name + ".jpg")


if __name__ == "__main__":
    import os
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=5000, debug=debug)
