import { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface Props {
  output: string;
  title?: string;
}

export default function TerminalOutput({ output, title = '终端输出' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!output) return null;

  return (
    <div className="rounded-md border border-[#30363d] bg-[#0d1117] overflow-hidden text-[11px] font-mono">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#30363d] bg-[#161b22] text-[#8b949e]">
        <Terminal className="w-3 h-3" />
        <span>{title}</span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto p-2 whitespace-pre-wrap text-[#c9d1d9] scrollbar-thin"
      >
        {output || <span className="text-[#6e7681] italic">等待命令输出...</span>}
      </div>
    </div>
  );
}
