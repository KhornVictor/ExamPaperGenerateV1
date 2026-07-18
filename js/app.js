/* ==========================================================================
   app.js — editor shell: load JSON, validate, re-render the preview, print.
   ========================================================================== */

import { renderPaper } from "./render.js";
import { validateExam } from "./validate.js";

const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const status = document.getElementById("status");
const answersToggle = document.getElementById("answers-toggle");

let debounce;

function setStatus(message, isError) {
  status.textContent = message;
  status.classList.toggle("editor__status--error", Boolean(isError));
}

function render() {
  let data;
  try {
    data = JSON.parse(editor.value);
  } catch (err) {
    setStatus(`JSON syntax error — ${err.message}`, true);
    return;
  }

  const problems = validateExam(data);
  if (problems.length) {
    setStatus(`Invalid exam document:\n• ${problems.join("\n• ")}`, true);
    return;
  }

  try {
    const paper = renderPaper(data, { showAnswers: answersToggle.checked });
    preview.replaceChildren(paper);
    const count = (data.sections || []).reduce(
      (n, s) => n + (s.questions?.length || s.columnA?.length || 0),
      0
    );
    setStatus(`OK — ${data.sections.length} sections, ${count} items.`, false);
  } catch (err) {
    setStatus(err.message, true);
  }
}

function scheduleRender() {
  clearTimeout(debounce);
  debounce = setTimeout(render, 250);
}

/* --- file in / out ------------------------------------------------------- */

async function loadDefault() {
  try {
    const res = await fetch("data/main.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    editor.value = JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    setStatus(
      `Could not load data/main.json (${err.message}).\n` +
        `Open the app through the local server (npm start), not by double-clicking index.html — ` +
        `browsers block fetch on file:// URLs.`,
      true
    );
    return;
  }
  render();
}

document.getElementById("open-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.value = reader.result;
    render();
  };
  reader.readAsText(file, "utf-8");
  event.target.value = "";
});

document.getElementById("save-json").addEventListener("click", () => {
  const blob = new Blob([editor.value], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exam.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("format-json").addEventListener("click", () => {
  try {
    editor.value = JSON.stringify(JSON.parse(editor.value), null, 2);
    render();
  } catch (err) {
    setStatus(`JSON syntax error — ${err.message}`, true);
  }
});

/* --- print --------------------------------------------------------------- */

document.getElementById("print").addEventListener("click", async () => {
  // Printing before the Khmer font finishes loading silently falls back to a
  // system font, so make sure it is resolved first.
  if (document.fonts) await document.fonts.ready;
  window.print();
});

editor.addEventListener("input", scheduleRender);
answersToggle.addEventListener("change", render);

loadDefault();
