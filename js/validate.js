/* ==========================================================================
   validate.js — structural checks on an exam document.
   Returns an array of human-readable problems; empty means the document is
   renderable. Kept separate from render.js so the rules are easy to read.
   ========================================================================== */

const SECTION_TYPES = ["mcq", "matching", "fill", "essay"];

export function validateExam(data) {
  const problems = [];

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return ["Document must be a JSON object."];
  }

  if (!data.meta || typeof data.meta !== "object") {
    problems.push("Missing `meta` object (school, subject, grade, duration …).");
  } else if (data.meta.fields && !Array.isArray(data.meta.fields)) {
    problems.push("`meta.fields` must be an array of label strings.");
  }

  if (!Array.isArray(data.sections)) {
    problems.push("Missing `sections` array.");
    return problems;
  }

  data.sections.forEach((section, i) => {
    const where = `Section ${i + 1}`;

    if (!section || typeof section !== "object") {
      problems.push(`${where}: must be an object.`);
      return;
    }

    if (!SECTION_TYPES.includes(section.type)) {
      problems.push(
        `${where}: \`type\` is "${section.type}" — must be one of ${SECTION_TYPES.join(", ")}.`
      );
      return;
    }

    if (section.type === "matching") {
      if (!Array.isArray(section.columnA) || !Array.isArray(section.columnB)) {
        problems.push(`${where} (matching): needs \`columnA\` and \`columnB\` arrays.`);
      }
      if (section.answers && !Array.isArray(section.answers)) {
        problems.push(`${where} (matching): \`answers\` must be an array.`);
      }
      return;
    }

    if (!Array.isArray(section.questions)) {
      problems.push(`${where} (${section.type}): needs a \`questions\` array.`);
      return;
    }

    section.questions.forEach((q, qi) => {
      const qWhere = `${where} question ${qi + 1}`;

      if (!q || typeof q !== "object") {
        problems.push(`${qWhere}: must be an object.`);
        return;
      }
      if (typeof q.text !== "string" || !q.text.trim()) {
        problems.push(`${qWhere}: \`text\` is required.`);
      }

      if (section.type === "mcq") {
        if (!Array.isArray(q.choices) || q.choices.length < 2) {
          problems.push(`${qWhere}: \`choices\` must have at least 2 entries.`);
        } else if (q.choices.length > 8) {
          problems.push(`${qWhere}: at most 8 choices are supported (ក–ជ).`);
        }
        if (
          q.answer !== undefined &&
          (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.choices?.length ?? 0))
        ) {
          problems.push(
            `${qWhere}: \`answer\` must be a 0-based index into \`choices\` (0 = ក).`
          );
        }
      }

      if (section.type === "fill" && !/\{\{[^}]*\}\}/.test(q.text ?? "")) {
        problems.push(`${qWhere}: fill text has no {{ }} blank marker.`);
      }

      if (
        section.type === "essay" &&
        q.answerLines !== undefined &&
        (!Number.isInteger(q.answerLines) || q.answerLines < 1 || q.answerLines > 40)
      ) {
        problems.push(`${qWhere}: \`answerLines\` must be a whole number between 1 and 40.`);
      }
    });
  });

  return problems;
}
