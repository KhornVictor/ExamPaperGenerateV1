/* ==========================================================================
   render.js — turns an exam JSON document into DOM nodes.
   Pure: no globals touched, no I/O. renderPaper(data, opts) -> HTMLElement.
   ========================================================================== */

const KHMER_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const KHMER_LETTERS = ["ក", "ខ", "គ", "ឃ", "ង", "ច", "ឆ", "ជ"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** 1963 -> "១៩៦៣" */
function toKhmerDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => KHMER_DIGITS[Number(d)]);
}

/** Question/row numbering, per the section's `numbering` setting. */
function numberLabel(index, style) {
  return style === "latin" ? String(index + 1) : toKhmerDigits(index + 1);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function pointsLabel(points, unit) {
  if (points === undefined || points === null || points === "") return "";
  return `(${points}${unit})`;
}

/* --- masthead ------------------------------------------------------------ */

function renderMasthead(meta) {
  const wrap = el("header", "masthead-wrap");

  const head = el("div", "masthead");
  const left = el("div", "masthead__left");
  if (meta.school) left.appendChild(el("div", "masthead__school", meta.school));
  if (meta.examTitle) left.appendChild(el("div", "masthead__exam", meta.examTitle));
  head.appendChild(left);

  const right = el("div", "masthead__right", meta.rightHeader || "");
  head.appendChild(right);
  wrap.appendChild(head);

  const fields = el("div", "fields");
  for (const label of meta.fields || []) {
    const row = el("div", "field");
    row.appendChild(el("span", "field__label", label));
    row.appendChild(el("span", "field__rule"));
    fields.appendChild(row);
  }
  wrap.appendChild(fields);
  wrap.appendChild(el("div", "masthead__divider", "-".repeat(175)));

  return wrap;
}

function renderTitle(meta) {
  const wrap = el("div", "paper-title");

  const parts = [];
  if (meta.subjectLabel !== "") parts.push(meta.subjectLabel || "វិញ្ញាសា");
  if (meta.subject) parts.push(meta.subject);
  let main = parts.join(" ");
  if (meta.grade) main += ` (${meta.grade})`;
  if (main) wrap.appendChild(el("div", "paper-title__main", main));

  if (meta.duration) {
    const label = meta.durationLabel || "រយៈពេល";
    wrap.appendChild(el("div", "paper-title__duration", `${label} ${meta.duration}`));
  }

  return wrap;
}

/* --- section frame ------------------------------------------------------- */

function renderSectionHead(section, index) {
  const head = el("div", "section__head");
  head.appendChild(el("span", "section__numeral", `${ROMAN[index] || index + 1}.`));

  const title = el("span", "section__title", section.title || "");
  const points = pointsLabel(section.points, section.pointsUnit || "pt");
  if (points) title.appendChild(el("span", "section__points", ` ${points}`));
  head.appendChild(title);
  return head;
}

/* --- I. multiple choice -------------------------------------------------- */

function renderMcq(section, showAnswers) {
  const body = el("div", "section__body");
  const numbering = section.numbering || "latin";

  (section.questions || []).forEach((q, qi) => {
    const block = el("div", "question");

    const head = el("div", "question__head");
    head.appendChild(el("span", "question__num", `${numberLabel(qi, numbering)}.`));
    head.appendChild(el("span", "question__text", q.text || ""));
    block.appendChild(head);

    const choices = el("div", "choices");
    if (section.choicesPerRow) {
      choices.style.gridTemplateColumns = `repeat(${section.choicesPerRow}, 1fr)`;
    }

    (q.choices || []).forEach((choice, ci) => {
      const item = el("div", "choice");
      const box = el("span", "choice__box");
      // The answer mark lives inside the box so the layout is identical
      // whether or not the key is showing.
      if (showAnswers && q.answer === ci) {
        box.appendChild(el("span", "answer", "✓"));
      }
      item.appendChild(box);
      item.appendChild(el("span", "choice__text", `${KHMER_LETTERS[ci]}. ${choice}`));
      choices.appendChild(item);
    });

    block.appendChild(choices);
    body.appendChild(block);
  });

  return body;
}

/* --- II. matching -------------------------------------------------------- */

function renderMatching(section, showAnswers) {
  const body = el("div", "section__body");
  const table = el("table", "matching");
  const numbering = section.numbering || "khmer";
  const bNumbering = section.numberingB || "khmer-letter";

  const colgroup = el("colgroup");
  for (const cls of ["col-a", "col-b", "col-answer"]) {
    const col = document.createElement("col");
    col.className = cls;
    colgroup.appendChild(col);
  }
  table.appendChild(colgroup);

  const headers = section.headers || {};
  const thead = el("thead");
  const hrow = el("tr");
  hrow.appendChild(el("th", null, headers.a ?? "A"));
  hrow.appendChild(el("th", null, headers.b ?? "B"));
  hrow.appendChild(el("th", null, headers.answer ?? "ចម្លើយ"));
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = el("tbody");
  const columnA = section.columnA || [];
  const columnB = section.columnB || [];
  // Column A and B are shuffled independently on a real paper, so they need
  // not be the same length — render as many rows as the longer column.
  const rowCount = Math.max(columnA.length, columnB.length);

  for (let i = 0; i < rowCount; i++) {
    const row = el("tr");

    const aLabel = columnA[i] !== undefined ? `${numberLabel(i, numbering)}. ${columnA[i]}` : "";
    row.appendChild(el("td", null, aLabel));

    const bTag = bNumbering === "khmer-letter" ? KHMER_LETTERS[i] : numberLabel(i, bNumbering);
    const bLabel = columnB[i] !== undefined ? `${bTag}. ${columnB[i]}` : "";
    row.appendChild(el("td", null, bLabel));

    // "១ → " with the key filled in only in answer mode.
    const answerCell = el("td", "matching__answer");
    if (columnA[i] !== undefined) {
      answerCell.appendChild(document.createTextNode(`${numberLabel(i, numbering)} → `));
      if (showAnswers && section.answers && section.answers[i] !== undefined) {
        answerCell.appendChild(el("span", "answer", section.answers[i]));
      }
    }
    row.appendChild(answerCell);

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  body.appendChild(table);
  return body;
}

/* --- III. fill in the gaps ----------------------------------------------- */

/**
 * Splits a template on {{...}} markers and returns alternating text nodes and
 * blank rules. "{{}}" is an empty blank; "{{ភ្នំពេញ}}" carries its own answer.
 */
function renderFillTemplate(template, showAnswers, defaultWidth) {
  const frag = document.createDocumentFragment();
  const pattern = /\{\{([^}]*)\}\}/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(template)) !== null) {
    if (match.index > cursor) {
      frag.appendChild(document.createTextNode(template.slice(cursor, match.index)));
    }

    const answer = match[1].trim();
    const blank = el("span", "blank");
    if (defaultWidth) blank.style.minWidth = defaultWidth;
    if (showAnswers && answer) {
      blank.classList.add("blank--filled", "answer");
      blank.textContent = answer;
    } else {
      // A blank with no content collapses to zero height; keep it on the line.
      blank.innerHTML = "&nbsp;";
    }
    frag.appendChild(blank);

    cursor = pattern.lastIndex;
  }

  if (cursor < template.length) {
    frag.appendChild(document.createTextNode(template.slice(cursor)));
  }

  return frag;
}

function renderFill(section, showAnswers) {
  const body = el("div", "section__body");
  const numbering = section.numbering || "latin";

  (section.questions || []).forEach((q, qi) => {
    const block = el("div", "question");
    const head = el("div", "question__head");
    head.appendChild(el("span", "question__num", `${numberLabel(qi, numbering)}.`));

    const text = el("span", "question__text");
    text.appendChild(renderFillTemplate(q.text || "", showAnswers, section.blankWidth));
    head.appendChild(text);

    block.appendChild(head);
    body.appendChild(block);
  });

  return body;
}

/* --- IV. written questions ----------------------------------------------- */

function renderEssay(section, showAnswers) {
  const body = el("div", "section__body");
  const numbering = section.numbering || "latin";

  (section.questions || []).forEach((q, qi) => {
    const block = el("div", "question");

    const head = el("div", "question__head");
    head.appendChild(el("span", "question__num", `${numberLabel(qi, numbering)}.`));

    const text = el("span", "question__text");
    const points = pointsLabel(q.points, section.pointsUnit || "pt");
    if (points) text.appendChild(el("span", "question__points", `${points} `));
    text.appendChild(document.createTextNode(q.text || ""));
    head.appendChild(text);
    block.appendChild(head);

    // Writing space for the student: `answerLines` for ruled lines, or
    // `answerSpace` (a CSS length) for plain blank space.
    // if (q.answerLines) {
    //   const lines = el("div", "answer-lines");
    //   for (let i = 0; i < q.answerLines; i++) lines.appendChild(el("div", "answer-line"));
    //   block.appendChild(lines);
    // } else if (q.answerSpace) {
    //   const space = el("div", "answer-space");
    //   space.style.height = q.answerSpace;
    //   block.appendChild(space);
    // }

    if (showAnswers && q.answer) {
      block.appendChild(el("div", "answer answer-only", q.answer));
    }

    body.appendChild(block);
  });

  return body;
}

const RENDERERS = {
  mcq: renderMcq,
  matching: renderMatching,
  fill: renderFill,
  essay: renderEssay,
};

/* --- entry point --------------------------------------------------------- */

export function renderPaper(data, opts = {}) {
  const showAnswers = Boolean(opts.showAnswers);

  const paper = el("article", "paper");
  if (showAnswers) paper.classList.add("paper--answers");

  const meta = data.meta || {};
  paper.appendChild(renderMasthead(meta));
  paper.appendChild(renderTitle(meta));

  (data.sections || []).forEach((section, index) => {
    const renderer = RENDERERS[section.type];
    if (!renderer) {
      throw new Error(
        `Section ${index + 1}: unknown type "${section.type}". ` +
          `Expected one of: ${Object.keys(RENDERERS).join(", ")}.`
      );
    }

    const node = el("section", "section");
    node.appendChild(renderSectionHead(section, index));
    node.appendChild(renderer(section, showAnswers));
    paper.appendChild(node);
  });

  return paper;
}

export { toKhmerDigits };
