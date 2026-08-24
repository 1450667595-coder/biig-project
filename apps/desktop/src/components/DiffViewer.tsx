interface DiffProps {
  path: string;
  original: string;
  modified: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLine: number;
  newLine: number;
  content: string;
}

function lcs<T>(a: T[], b: T[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const dp = lcs(originalLines, modifiedLines);
  const result: DiffLine[] = [];
  let i = originalLines.length;
  let j = modifiedLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      result.unshift({ type: 'unchanged', oldLine: i, newLine: j, content: originalLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', oldLine: 0, newLine: j, content: modifiedLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', oldLine: i, newLine: 0, content: originalLines[i - 1] });
      i--;
    }
  }

  return result;
}

export default function DiffViewer({ path, original, modified }: DiffProps) {
  const diff = computeDiff(original, modified);
  const isNewFile = original === '' && modified !== '';
  const addedCount = diff.filter((d) => d.type === 'added').length;
  const removedCount = diff.filter((d) => d.type === 'removed').length;

  return (
    <div className="rounded-md border border-[#30363d] bg-[#0d1117] overflow-hidden text-[11px] font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] bg-[#161b22] text-[#c9d1d9]">
        <span className="truncate">{path}</span>
        <div className="flex items-center gap-2">
          {addedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#238636]/15 text-[#3fb950]">
              +{addedCount}
            </span>
          )}
          {removedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f85149]/15 text-[#f85149]">
              -{removedCount}
            </span>
          )}
          {isNewFile && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950]">
              新增文件
            </span>
          )}
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {diff.length === 0 ? (
          <div className="p-4 text-[#6e7681] italic">无变更</div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {diff.map((d, idx) => (
                <tr
                  key={idx}
                  className={
                    d.type === 'added'
                      ? 'bg-[#238636]/10'
                      : d.type === 'removed'
                        ? 'bg-[#f85149]/10'
                        : 'hover:bg-[#21262d]'
                  }
                >
                  <td className="w-10 px-2 py-0.5 text-right text-[#6e7681] select-none border-r border-[#30363d]">
                    {d.oldLine || ' '}
                  </td>
                  <td className="w-10 px-2 py-0.5 text-right text-[#6e7681] select-none border-r border-[#30363d]">
                    {d.newLine || ' '}
                  </td>
                  <td className="w-6 px-2 py-0.5 text-center text-[#8b949e] select-none border-r border-[#30363d]">
                    {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                  </td>
                  <td
                    className={`px-2 py-0.5 whitespace-pre ${
                      d.type === 'added'
                        ? 'text-[#3fb950]'
                        : d.type === 'removed'
                          ? 'text-[#f85149]'
                          : 'text-[#c9d1d9]'
                    }`}
                  >
                    {d.content || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
