import fs from "fs";
import path from "path";

export function readSkillMarkdown(skillPath: string): string {
  const sanitized = skillPath.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitized) {
    throw new Error("Invalid skill path");
  }
  const fullPath = path.join(process.cwd(), "src", "skills", sanitized, "skill.md");
  return fs.readFileSync(fullPath, "utf-8");
}
