// Support the simple formulas in older chat messages, without injecting HTML.
export function readableMath(text: string) {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
    '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺',
  };
  return text.replace(/\\(?:cdot|times)\b/g, '×')
    .replace(/\\div\b/g, '÷').replace(/\\(?:leq|le)\b/g, '≤').replace(/\\(?:geq|ge)\b/g, '≥')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\(?:text|mathrm)\{([^{}]+)\}/g, '$1')
    .replace(/\^\{([\d+-]+)\}|\^([\d+-]+)/g, (_match, grouped: string, plain: string) =>
      [...(grouped || plain)].map((char) => superscripts[char]).join(''))
    .replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, (_match, block: string, inline: string) => block ?? inline)
    .replace(/\\[()[\]]/g, '').replace(/\\(?:left|right)\b/g, '')
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1');
}
