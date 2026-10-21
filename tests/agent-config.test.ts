import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const requiredAgents = [
  "accounting-analyst", "architecture-guardian", "business-analyst", "code-reviewer",
  "frontend-developer", "marketing-strategist", "orchestrator", "qa-engineer",
  "security-reviewer", "senior-backend", "system-operator", "ui-ux-designer",
];

test("project sub-agents are complete, unique and safely described", async () => {
  const directory = path.join(process.cwd(), ".cursor", "agents");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".md"));
  const names: string[] = [];
  for (const file of files) {
    const source = await readFile(path.join(directory, file), "utf8");
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    assert.ok(frontmatter, `${file} must contain YAML frontmatter`);
    const name = frontmatter[1].match(/^name:\s*(.+)$/m)?.[1].trim();
    const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1].trim();
    assert.ok(name && /^[a-z]+(?:-[a-z]+)*$/.test(name), `${file} has an invalid name`);
    assert.equal(file, `${name}.md`, `${file} must match its agent name`);
    assert.ok(description && description.length >= 40, `${file} needs a specific description`);
    assert.match(source, /status|Status/, `${file} must define a report status`);
    assert.match(source, /deploy|production|üretim/i, `${file} must define production boundaries`);
    names.push(name);
  }
  assert.equal(new Set(names).size, names.length, "agent names must be unique");
  for (const name of requiredAgents) assert.ok(names.includes(name), `${name} is required`);
});
