document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const refInput = document.getElementById("reference-file");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const fileList = document.getElementById("file-list");
  const removeBtn = document.getElementById("remove-selected");
  const thresholdInput = document.getElementById("threshold");
  const chunkInput = document.getElementById("chunk-size");
  const progressText = document.getElementById("progress");
  const resultsSection = document.getElementById("results-section");
  const resultsTable = document.getElementById("results-table").querySelector("tbody");
  const downloadBtn = document.getElementById("downloadCSV");
  const compareRadios = document.getElementsByName("compareMode");
  const referenceSection = document.getElementById("reference-section");

  let selectedFiles = [];
  let referenceFile = null;

  compareRadios.forEach(r => {
    r.addEventListener("change", () => {
      if (r.checked && r.value === "reference") {
        referenceSection.classList.remove("hidden");
      } else {
        referenceSection.classList.add("hidden");
      }
    });
  });

  fileInput.addEventListener("change", () => {
    selectedFiles = Array.from(fileInput.files).slice(0, 10);
    fileList.innerHTML = selectedFiles.map(file => `<li>${file.name}</li>`).join("");
    analyzeBtn.disabled = selectedFiles.length === 0;
  });

  refInput.addEventListener("change", () => {
    referenceFile = refInput.files[0];
  });

  removeBtn.addEventListener("click", () => {
    selectedFiles = [];
    referenceFile = null;
    fileInput.value = "";
    refInput.value = "";
    fileList.innerHTML = "";
    analyzeBtn.disabled = true;
  });

  analyzeBtn.addEventListener("click", async () => {
    const selectedMode = [...compareRadios].find(r => r.checked).value;
    if (selectedMode === "each-other" && selectedFiles.length < 2) {
      alert("Please upload at least 2 files.");
      return;
    }
    if (selectedMode === "reference" && (!referenceFile || selectedFiles.length === 0)) {
      alert("Upload reference file and at least one file to compare.");
      return;
    }

    progressText.classList.remove("hidden");
    resultsSection.classList.add("hidden");
    resultsTable.innerHTML = "";

    const formData = new FormData();
    formData.append("threshold", thresholdInput.value);
    formData.append("chunkSize", chunkInput.value || "20");
    selectedFiles.forEach(file => formData.append("files", file));
    if (selectedMode === "reference") {
      formData.append("reference", referenceFile);
    }

    const endpoint = selectedMode === "reference"
      ? "http://localhost:5000/compare_reference"
      : "http://localhost:5000/compare_pairwise";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      progressText.classList.add("hidden");

      if (response.ok) {
        resultsSection.classList.remove("hidden");
        data.forEach(result => {
          const row = document.createElement("tr");
          if (selectedMode === "reference") {
            row.innerHTML = `
              <td>${result.file}</td>
              <td>Reference</td>
              <td>${result.similarity}%</td>
              <td>${result.threshold_exceeded ? "✅ Yes" : "❌ No"}</td>
            `;
          } else {
            row.innerHTML = `
              <td>${result.fileA}</td>
              <td>${result.fileB}</td>
              <td>${result.similarity}%</td>
              <td>${result.threshold_exceeded ? "✅ Yes" : "❌ No"}</td>
            `;
          }
          resultsTable.appendChild(row);
        });

        downloadBtn.classList.remove("hidden");
        downloadBtn.onclick = () => generateCSVFromResults("results-table", selectedMode);
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      progressText.classList.add("hidden");
      alert("Connection error: " + err.message);
    }
  });

  function generateCSVFromResults(tableId, mode = "each-other") {
    const table = document.getElementById(tableId);
    let csv = "";
    if (mode === "reference") {
      csv = "File,Similarity (%),Above Threshold\n";
      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        csv += `${row.cells[0].innerText},${row.cells[2].innerText},${row.cells[3].innerText}\n`;
      }
    } else {
      csv = "File 1,File 2 / Similar File,Similarity (%),Above Threshold\n";
      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        csv += `${row.cells[0].innerText},${row.cells[1].innerText},${row.cells[2].innerText},${row.cells[3].innerText}\n`;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
