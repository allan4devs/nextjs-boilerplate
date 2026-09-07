import { findMachineGuide, type MachineLabel } from "@/app/lib/machines";

export type MachineLabelContent = {
  title: string;
  subtitle: string;
  zone: string;
  benefits: string;
};

/** Keep editable wording intact while moving model and use details below the title. */
function splitMachineName(name: string): Pick<MachineLabelContent, "title" | "subtitle"> {
  const original = name.trim();
  let heading = original;
  let suffix = "";
  let depth = 0;

  // A spaced dash separates details; internal hyphens (multi-estación) do not.
  for (let index = 0; index < original.length; index += 1) {
    const character = original[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (
      depth === 0 &&
      /[-–—]/.test(character) &&
      /\s/.test(original[index - 1] ?? "") &&
      /\s/.test(original[index + 1] ?? "")
    ) {
      const before = original.slice(0, index).trim();
      const after = original.slice(index + 1).trim();
      if (before && after) {
        heading = before;
        suffix = after;
        break;
      }
    }
  }

  const details: string[] = [];
  const titleParts: string[] = [];
  let copiedUntil = 0;
  let groupStart = -1;
  depth = 0;
  for (let index = 0; index < heading.length; index += 1) {
    if (heading[index] === "(") {
      if (depth === 0) groupStart = index;
      depth += 1;
    } else if (heading[index] === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        const detail = heading.slice(groupStart + 1, index).trim();
        if (detail) {
          titleParts.push(heading.slice(copiedUntil, groupStart));
          details.push(detail);
          copiedUntil = index + 1;
        }
      }
    }
  }
  titleParts.push(heading.slice(copiedUntil));
  const title = titleParts.join(" ").replace(/\s+/g, " ").trim();

  // A name consisting only of parentheses still needs a usable main heading.
  if (!title) return { title: heading, subtitle: suffix };
  if (suffix) details.push(suffix);
  return { title, subtitle: details.join(" · ") };
}

export function getMachineLabelContent(item: MachineLabel): MachineLabelContent {
  const guide = findMachineGuide(item.id);
  const benefits: string[] = [];
  if (guide?.tips.some((tip) => tip.trim())) benefits.push("Técnica");
  if (guide?.setup.trim()) benefits.push("Ajustes");
  if (guide?.mistakes.some((mistake) => mistake.trim())) benefits.push("Errores comunes");

  return {
    ...splitMachineName(item.name),
    zone: guide?.zone.trim() || "Guía de máquina",
    benefits: benefits.join(" · "),
  };
}
