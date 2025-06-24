from flask import Flask, request, jsonify
import hashlib, os
from io import BytesIO
from PyPDF2 import PdfReader
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

ALLOWED_EXTENSIONS = {'.txt', '.pdf'}

def is_allowed(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def read_file(file_storage):
    filename = file_storage.filename
    if filename.endswith('.pdf'):
        pdf = PdfReader(BytesIO(file_storage.read()))
        return ' '.join(page.extract_text() or '' for page in pdf.pages)
    else:
        return file_storage.read().decode('utf-8', errors='ignore')

def preprocess(text):
    return ' '.join(text.lower().split())

def get_chunks(text, size):
    words = text.split()
    return [' '.join(words[i:i+size]) for i in range(len(words) - size + 1)]

def hash_chunk(chunk):
    return hashlib.md5(chunk.encode()).hexdigest()

def get_hashed_chunks(text, chunk_size):
    return set(hash_chunk(chunk) for chunk in get_chunks(preprocess(text), chunk_size))

@app.route('/compare_pairwise', methods=['POST'])
def compare_pairwise():
    files = request.files.getlist('files')
    threshold = float(request.form.get("threshold", 75))
    chunk_size = int(request.form.get("chunkSize", 20))
    data = []

    contents = {file.filename: read_file(file) for file in files}
    hashes = {name: get_hashed_chunks(text, chunk_size) for name, text in contents.items()}

    for i in range(len(files)):
        for j in range(i + 1, len(files)):
            name1, name2 = files[i].filename, files[j].filename
            common = hashes[name1] & hashes[name2]
            total = min(len(hashes[name1]), len(hashes[name2]))
            similarity = round((len(common) / total) * 100, 2) if total else 0
            data.append({
                "fileA": name1,
                "fileB": name2,
                "similarity": similarity,
                "threshold_exceeded": similarity >= threshold
            })

    return jsonify(data)

@app.route('/compare_reference', methods=['POST'])
def compare_with_reference():
    reference = request.files.get('reference')
    files = request.files.getlist('files')

    if not reference or len(files) == 0:
        return jsonify({"error": "Missing reference or files"}), 400

    threshold = float(request.form.get("threshold", 75))
    chunk_size = int(request.form.get("chunkSize", 20))

    ref_text = read_file(reference)
    ref_hashes = get_hashed_chunks(ref_text, chunk_size)
    results = []

    for file in files:
        text = read_file(file)
        target_hashes = get_hashed_chunks(text, chunk_size)

        if not ref_hashes or not target_hashes:
            similarity = 0
        else:
            common = ref_hashes.intersection(target_hashes)
            similarity = round((len(common) / min(len(ref_hashes), len(target_hashes))) * 100, 2)

        results.append({
            "file": file.filename,
            "similarity": similarity,
            "threshold_exceeded": similarity >= threshold
        })

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
