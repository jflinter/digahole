export default function megaPrompt(text: string): string {
  const val = prompt(text);
  if (!val || val === "") {
    return megaPrompt("No seriously");
  }
  return val;
}
