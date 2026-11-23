/**
 * Minimal, safe Markdown renderer for lesson bodies.
 *
 * Everything is emitted as React elements — no dangerouslySetInnerHTML, so a
 * lesson body can never inject markup. Supports what the course content uses:
 * headings, paragraphs, lists, tables, blockquotes, fenced code, inline code,
 * bold, italic and links.
 */

function inline(text, keyPrefix = 'i') {
  const nodes = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|_[^_]+_)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m && /^https?:\/\//i.test(m[2])) {
        nodes.push(
          <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>,
        );
      } else nodes.push(token);
    } else if (token.startsWith('_')) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;
  let seenTitle = false;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={key++} data-lang={lang || undefined}>
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2], `h${key}`);
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h2' : 'h3';
      // A `# Title` line is the lesson title; the page already shows it.
      const isDocumentTitle = level === 1 && seenTitle !== true;
      if (level === 1) seenTitle = true;
      if (isDocumentTitle) {
        i += 1;
        continue;
      }
      blocks.push(<Tag key={key++}>{content}</Tag>);
      i += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(<blockquote key={key++}>{inline(quote.join(' '), `q${key}`)}</blockquote>);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{inline(item, `ul${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{inline(item, `ol${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
        i += 1;
      }
      blocks.push(
        <table key={key++}>
          <thead>
            <tr>
              {header.map((h, idx) => (
                <th key={idx}>{inline(h, `th${key}-${idx}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{inline(cell, `td${key}-${rIdx}-${cIdx}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|> |[-*]\s|\d+\.\s|```|\|)/.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    if (paragraph.length) {
      blocks.push(<p key={key++}>{inline(paragraph.join(' '), `p${key}`)}</p>);
    } else {
      i += 1;
    }
  }

  return <div className="prose">{blocks}</div>;
}
