interface Props {
  output: string;
  className?: string;
}

const ANSI_COLOR_MAP: Record<string, string> = {
  '30': '#24292f',
  '31': '#f85149',
  '32': '#3fb950',
  '33': '#d29922',
  '34': '#58a6ff',
  '35': '#a371f7',
  '36': '#39c5cf',
  '37': '#c9d1d9',
  '90': '#6e7681',
  '91': '#ff7b72',
  '92': '#7ee787',
  '93': '#ffa657',
  '94': '#79c0ff',
  '95': '#d2a8ff',
  '96': '#56d4dd',
  '97': '#ffffff',
};

interface Segment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

function parseAnsi(input: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let current: Segment = { text: '' };

  const pushCurrent = () => {
    if (current.text) {
      segments.push({ ...current });
      current.text = '';
    }
  };

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const text = input.slice(lastIndex, match.index);
    if (text) {
      current.text = text;
      pushCurrent();
    }

    const codes = match[1].split(';').filter(Boolean);
    if (codes.length === 0 || match[1] === '' || codes.includes('0')) {
      current = { text: '' };
    }

    for (const code of codes) {
      if (code === '1') current.bold = true;
      if (code === '3') current.italic = true;
      if (code === '4') current.underline = true;
      if (ANSI_COLOR_MAP[code]) current.color = ANSI_COLOR_MAP[code];
      if (code.startsWith('38;2;')) {
        const parts = code.split(';');
        if (parts.length === 4) {
          current.color = `rgb(${parts[1]}, ${parts[2]}, ${parts[3]})`;
        }
      }
      if (code.startsWith('48;2;')) {
        const parts = code.split(';');
        if (parts.length === 4) {
          current.bgColor = `rgb(${parts[1]}, ${parts[2]}, ${parts[3]})`;
        }
      }
    }

    lastIndex = regex.lastIndex;
  }

  const remaining = input.slice(lastIndex);
  if (remaining) {
    current.text = remaining;
    pushCurrent();
  }

  return segments;
}

export default function AnsiOutput({ output, className = '' }: Props) {
  if (!output) return null;
  const segments = parseAnsi(output);

  return (
    <span className={className}>
      {segments.map((seg, idx) => (
        <span
          key={idx}
          style={{
            color: seg.color,
            backgroundColor: seg.bgColor,
            fontWeight: seg.bold ? 'bold' : undefined,
            fontStyle: seg.italic ? 'italic' : undefined,
            textDecoration: seg.underline ? 'underline' : undefined,
          }}
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
}
