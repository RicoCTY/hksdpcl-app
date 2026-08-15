import type { Character } from "@/store/projectStore";

export function characterDisplayName(character: Character, untitled: string) {
  return character.name.trim() || untitled;
}

export function findActiveMention(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  if (cursor < 0 || cursor > text.length) return null;

  const before = text.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;

  const query = before.slice(at + 1);
  if (/[\s\n]/.test(query)) return null;

  const prev = at > 0 ? before[at - 1] : "";
  if (prev && /[A-Za-z0-9._]/.test(prev)) return null;

  return { start: at, query };
}

export function filterMentionableCharacters(
  characters: Character[],
  query: string,
  untitled: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return characters;

  return characters.filter((character) => {
    const name = characterDisplayName(character, untitled).toLowerCase();
    const background = character.background.toLowerCase();
    return name.includes(needle) || background.includes(needle);
  });
}

export function parseMentionedCharacters(
  text: string,
  characters: Character[],
  untitled: string,
) {
  const named = characters
    .map((character) => ({
      character,
      name: characterDisplayName(character, untitled),
    }))
    .filter((item) => item.name)
    .sort((a, b) => b.name.length - a.name.length);

  const found = new Map<string, Character>();
  let index = 0;

  while (index < text.length) {
    if (text[index] === "@") {
      const rest = text.slice(index + 1);
      const match = named.find((item) => rest.startsWith(item.name));
      if (match) {
        found.set(match.character.id, match.character);
        index += 1 + match.name.length;
        continue;
      }
    }
    index += 1;
  }

  return [...found.values()];
}

export function splitMentionParts(
  text: string,
  characters: Character[],
  untitled: string,
) {
  const named = characters
    .map((character) => ({
      character,
      name: characterDisplayName(character, untitled),
    }))
    .filter((item) => item.name)
    .sort((a, b) => b.name.length - a.name.length);

  const parts: Array<{
    type: "text" | "mention";
    value: string;
    character?: Character;
  }> = [];
  let buffer = "";
  let index = 0;

  while (index < text.length) {
    if (text[index] === "@") {
      const rest = text.slice(index + 1);
      const match = named.find((item) => rest.startsWith(item.name));
      if (match) {
        if (buffer) {
          parts.push({ type: "text", value: buffer });
          buffer = "";
        }
        parts.push({
          type: "mention",
          value: match.name,
          character: match.character,
        });
        index += 1 + match.name.length;
        continue;
      }
    }
    buffer += text[index];
    index += 1;
  }

  if (buffer) parts.push({ type: "text", value: buffer });
  return parts;
}
