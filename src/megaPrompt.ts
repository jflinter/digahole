export default function megaPrompt(
  text: string,
  failureText: () => string,
  valid: (text: string | null) => boolean
): string | null {
  const val = prompt(text);
  if (!valid(val)) {
    return megaPrompt(failureText(), failureText, valid);
  }
  return val;
}
