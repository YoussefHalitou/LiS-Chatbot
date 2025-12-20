const SECRET_KEY_REGEX = /sk-[A-Za-z0-9-_.]{8,}/g

const PII_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'email', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  {
    label: 'phone',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/,
  },
  {
    label: 'credit_card',
    regex: /\b(?:\d[ -.]*?){13,16}\b/,
  },
  {
    label: 'ssn_like',
    regex: /\b\d{3}-\d{2}-\d{4}\b/,
  },
]

export function detectPii(texts: string[]) {
  const matches = new Set<string>()

  for (const text of texts) {
    for (const pattern of PII_PATTERNS) {
      if (pattern.regex.test(text)) {
        matches.add(pattern.label)
      }
    }
  }

  return { flagged: matches.size > 0, matches: Array.from(matches) }
}

export function redactForLogging(message: string) {
  let redacted = message.replace(SECRET_KEY_REGEX, '[redacted-key]')

  for (const pattern of PII_PATTERNS) {
    const replaceRegex =
      pattern.regex.flags.includes('g')
        ? pattern.regex
        : new RegExp(pattern.regex.source, `${pattern.regex.flags}g`)

    redacted = redacted.replace(replaceRegex, `[redacted-${pattern.label}]`)
  }

  return redacted
}
