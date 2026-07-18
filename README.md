# Exam Paper Generator — កម្មវិធីបង្កើតវិញ្ញាសា

Generates Khmer exam papers as A4 PDFs from a JSON file, in **Khmer OS Siemreap**.
Supports multiple choice (MCQ), matching, fill-in-the-gaps, and written questions.

## Run

```bash
npm start
```

Then open <http://localhost:5173>.

Use the local server rather than double-clicking `index.html` — browsers block
`fetch()` and font loading on `file://` URLs, so the app cannot load its JSON there.

## Making a PDF

Press **Print / Save as PDF**, then in the browser's print dialog:

| Setting | Value |
| --- | --- |
| Destination | Save as PDF |
| Paper size | A4 |
| Margins | Default (the paper carries its own 15mm margin) |
| Headers and footers | **Off** |
| Scale | 100% |

Background graphics can stay off — every rule, box, and line on the paper is drawn
with borders, so the output is identical either way.

The Khmer font is embedded in the resulting PDF, so it renders correctly on any
machine, including ones without Khmer OS Siemreap installed. The text stays
selectable and searchable rather than being flattened into an image.

### Why the browser, and not a PDF library

Khmer needs complex text shaping — subscripts (coeng), vowel reordering, and
ligatures. JavaScript PDF libraries such as jsPDF and pdfmake place glyphs in
codepoint order and produce broken Khmer. The browser shapes the text with
HarfBuzz and embeds the font on print, which is why the paper is laid out in HTML
and printed rather than drawn by a library.

## Toolbar

- **Open JSON…** — load an exam file from disk.
- **Format** — reformat the JSON in the editor.
- **Save JSON** — download the current editor contents.
- **Answer key** — show the correct answers in red. Useful for marking; turn it
  off before printing the students' copy.
- **Print / Save as PDF** — opens the print dialog.

Edits in the editor re-render the preview as you type. Errors appear in the status
bar at the bottom left.

## JSON format

```jsonc
{
  "meta": {
    "school": "សាលាបឋមសិក្សា វត្តជាង",       // top-left heading (Khmer OS Moul)
    "examTitle": "ប្រឡងប្រចាំឆមាសលើកទី ១",
    "rightHeader": "អនុវិទ្យាល័យវត្តជាង",      // sits above the first rule, top-right
    "fields": ["សម័យប្រឡង", "ហត្ថលេខា"],     // label + rule rows the student fills in
    "subjectLabel": "វិញ្ញាសា",               // "" to omit
    "subject": "ប្រវត្តិវិទ្យា",
    "grade": "ថ្នាក់ទី ៩",                    // rendered in brackets after the subject
    "durationLabel": "រយៈពេល",
    "duration": "៤០នាទី"
  },
  "sections": [ /* see below */ ]
}
```

Sections are numbered `I, II, III, IV…` automatically, in array order.

Every section takes:

| Key | Meaning |
| --- | --- |
| `type` | `mcq`, `matching`, `fill`, or `essay` |
| `title` | the instruction line |
| `points` | shown as `(4pt)` after the title |
| `pointsUnit` | defaults to `pt` |
| `numbering` | `latin` (`1.`) or `khmer` (`១.`) |

### `mcq` — multiple choice

Choices are lettered ក, ខ, គ, ឃ… automatically (up to 8). `answer` is a
**0-based index** into `choices`, so `0` = ក. It is optional, and only used by the
answer key.

```jsonc
{
  "type": "mcq",
  "title": "ចូរគូសសញ្ញា ✓ ក្នុងប្រអប់ដែលត្រឹមត្រូវ",
  "points": 4,
  "choicesPerRow": 4,
  "questions": [
    {
      "text": "ប្រទេសកម្ពុជាបានទទួលឯករាជ្យក្នុងឆ្នាំ",
      "choices": ["១៩៦៣", "១៩៥៤", "១៩៥៣", "១៩៧០"],
      "answer": 2
    }
  ]
}
```

### `matching` — ផ្គូផ្គង

Renders the A / B / ចម្លើយ table. `columnA` and `columnB` are independent, so
list column B already shuffled — row *n* of B is not the answer to row *n* of A.
`answers[i]` is the column-B letter matching row *i* of column A.

```jsonc
{
  "type": "matching",
  "title": "ចូរផ្គូផ្គង A និង B អោយបានត្រឹមត្រូវ",
  "points": 8,
  "headers": { "a": "A", "b": "B", "answer": "ចម្លើយ" },
  "columnA": ["ការបង្កើតរបបកម្ពុជាប្រជាធិបតេយ្យ", "..."],
  "columnB": ["២៤ កញ្ញា ១៩៩៣", "..."],
  "answers": ["ខ", "ក"]
}
```

### `fill` — បំពេញចន្លោះ

Write the sentence normally and mark each gap with `{{ }}`. Text inside the braces
is the answer: hidden on the student's paper, shown by the answer key.

```jsonc
{
  "type": "fill",
  "title": "បំពេញពាក្យក្នុងចន្លោះអោយបានត្រឹមត្រូវ",
  "points": 6,
  "blankWidth": "30mm",
  "questions": [
    { "text": "ព្រះបាទជ័យវរ្ម័នទី៧ ឡើងសោយរាជ្យនៅឆ្នាំ {{១១៨១}} ។" }
  ]
}
```

`{{}}` (empty) draws a blank with no stored answer.

### `essay` — សំណួរ

`answerLines` draws that many ruled lines for the student to write on.
Use `answerSpace` (`"30mm"`) instead for blank, unruled space.

```jsonc
{
  "type": "essay",
  "title": "សំណួរត្រិះរិះ",
  "points": 19,
  "questions": [
    {
      "points": 5,
      "text": "តើមូលហេតុអ្វីខ្លះដែលនាំឱ្យចក្រភពខ្មែរធ្លាក់ចុះ ?",
      "answerLines": 3,
      "answer": "..."   // optional, answer key only
    }
  ]
}
```

## Changing the fonts

Drop a `.ttf` into `fonts/` and update the `@font-face` rules in `css/fonts.css`.
Sizes, margins, and spacing are CSS variables at the top of `css/exam.css`:

```css
--paper-margin: 15mm;   /* page margin */
--size-body: 12pt;      /* body text */
line-height: 2;         /* on .paper — Khmer needs generous leading */
```

## Layout

```
index.html            editor shell
css/fonts.css         @font-face for Khmer OS Siemreap + Moul
css/exam.css          the paper (A4, print-exact — mm/pt only)
css/app.css           editor UI + print rules
js/render.js          JSON -> DOM
js/validate.js        schema checks, reported in the status bar
js/app.js             editor wiring
data/sample-exam.json worked example of every section type
serve.js              dependency-free static server
```

The sample paper's questions are placeholder content for demonstrating the
format — replace them with your own.
