import { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Save, Loader2, Check, AlertCircle, Wand2 } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  path: string;
  content: string;
  isDirty?: boolean;
  onChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void> | void;
  readOnly?: boolean;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  sh: 'shell',
  bash: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  xml: 'xml',
  vue: 'html',
  svelte: 'html',
};

export default function CodeEditor({ path, content, isDirty, onChange, onSave, readOnly = false }: Props) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState('');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const widgetRef = useRef<monaco.editor.IContentWidget | null>(null);
  const buttonRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const buttonDomRef = useRef<HTMLButtonElement | null>(null);
  const changed = isDirty !== undefined ? isDirty : value !== content;
  const { setSelectedSnippet, setActiveView, setBottomPanelVisible, setBottomPanelTab } = useAppStore();

  useEffect(() => {
    setValue(content);
    setError('');
  }, [content, path]);

  const handleChange = (newValue: string | undefined) => {
    const v = newValue ?? '';
    setValue(v);
    onChange?.(v);
  };

  const handleSave = useCallback(async () => {
    if (!onSave || !changed) return;
    setSaving(true);
    setError('');
    try {
      await onSave(value);
      setSaveSuccess(true);
      toast.success('已保存');
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err: any) {
      const msg = err.message || '保存失败';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [onSave, changed, value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const language = EXT_TO_LANG[path.split('.').pop()?.toLowerCase() || ''] || 'plaintext';

  const handleInlineEdit = useCallback(() => {
    const editor = editorRef.current;
    if (!selection || !editor) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLine = sel.startLineNumber;
    const endLine = sel.endLineNumber;
    setSelectedSnippet({ path, selection, startLine, endLine });
    setActiveView('chat');
    setBottomPanelVisible(true);
    setBottomPanelTab('terminal');
    setSelection('');
    setTimeout(() => {
      const textarea = document.querySelector('.chat-input textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 50);
  }, [selection, path, setSelectedSnippet, setActiveView, setBottomPanelVisible, setBottomPanelTab]);

  const createWidget = useCallback(() => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    if (!editor || !monacoInstance) return;

    const domNode = document.createElement('button');
    domNode.className =
      'inline-edit-button flex items-center gap-1 px-2 py-1 rounded-md bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[10px] font-medium shadow-lg transition-colors z-50';
    domNode.style.position = 'relative';
    domNode.style.border = 'none';
    domNode.style.cursor = 'pointer';
    domNode.tabIndex = -1;

    const root = createRoot(domNode);
    root.render(
      <>
        <Wand2 className="w-3 h-3" />
        AI 修改
      </>,
    );
    buttonRootRef.current = root;
    buttonDomRef.current = domNode;

    const widget: monaco.editor.IContentWidget = {
      getId: () => `inline-edit-button-${path}`,
      getDomNode: () => domNode,
      getPosition: () => ({
        position: editor.getSelection()?.getEndPosition() || { lineNumber: 1, column: 1 },
        preference: [monacoInstance.editor.ContentWidgetPositionPreference.ABOVE],
      }),
      allowEditorOverflow: true,
    };

    editor.addContentWidget(widget);
    widgetRef.current = widget;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleInlineEdit();
    };
    domNode.addEventListener('mousedown', handleClick);

    return () => {
      domNode.removeEventListener('mousedown', handleClick);
    };
  }, [path, handleInlineEdit]);

  const updateWidget = useCallback(() => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    const widget = widgetRef.current;
    const domNode = buttonDomRef.current;
    if (!editor || !monacoInstance || !domNode) return;

    const model = editor.getModel();
    const sel = editor.getSelection();
    if (!model || !sel || sel.isEmpty()) {
      domNode.style.display = 'none';
      return;
    }

    const selText = model.getValueInRange(sel);
    if (!selText.trim()) {
      domNode.style.display = 'none';
      return;
    }

    setSelection(selText);
    domNode.style.display = 'flex';
    if (widget) {
      editor.layoutContentWidget(widget);
    }
  }, []);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    monacoInstance.editor.defineTheme('biiig-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d1117',
        'editor.lineHighlightBackground': '#161b22',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#264f7855',
      },
    });
    monacoInstance.editor.setTheme('biiig-dark');

    // Inline edit content widget
    const cleanupWidget = createWidget();

    editor.onDidChangeCursorSelection(() => {
      // Defer so selection is stable after keyboard/mouse events
      requestAnimationFrame(updateWidget);
    });

    editor.onDidFocusEditorWidget(() => {
      requestAnimationFrame(updateWidget);
    });

    editor.onDidBlurEditorWidget(() => {
      // Give time for button click to register
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || !active.closest('.inline-edit-button')) {
          if (buttonDomRef.current) {
            buttonDomRef.current.style.display = 'none';
          }
        }
      }, 150);
    });

    // Right-click context menu action
    editor.addAction({
      id: 'biiig-inline-edit',
      label: 'AI 修改选区',
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyE],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 3,
      run: () => {
        const model = editor.getModel();
        const sel = editor.getSelection();
        if (!model || !sel || sel.isEmpty()) {
          toast.info('请先选中一段代码');
          return;
        }
        const selText = model.getValueInRange(sel);
        if (!selText.trim()) {
          toast.info('请先选中一段代码');
          return;
        }
        setSelectedSnippet({ path, selection: selText, startLine: sel.startLineNumber, endLine: sel.endLineNumber });
        setActiveView('chat');
        setBottomPanelVisible(true);
        setBottomPanelTab('terminal');
        setTimeout(() => {
          const textarea = document.querySelector('.chat-input textarea') as HTMLTextAreaElement | null;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 50);
      },
    });

    return () => {
      cleanupWidget?.();
      if (widgetRef.current && editorRef.current) {
        editorRef.current.removeContentWidget(widgetRef.current);
      }
      buttonRootRef.current?.unmount();
    };
  };

  const lines = value.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {error && (
        <div className="flex items-center gap-2 px-4 h-8 bg-[#f851491a] text-[#f85149] text-xs border-b border-[#f8514933]">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between px-4 h-9 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#8b949e] truncate">{path}</span>
          {changed && !readOnly && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e]" title="有未保存更改" />
          )}
        </div>
        {!readOnly && onSave && (
          <button
            onClick={handleSave}
            disabled={saving || !changed}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saveSuccess ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saveSuccess ? '已保存' : saving ? '保存中' : '保存 (Ctrl+S)'}
          </button>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={value}
          theme="biiig-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            scrollbar: { useShadows: false, verticalScrollbarSize: 10 },
            quickSuggestions: true,
            snippetSuggestions: 'inline',
            suggestOnTriggerCharacters: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            folding: true,
            contextmenu: true,
          }}
          onChange={handleChange}
          onMount={handleEditorMount}
        />
      </div>

      <div className="h-7 border-t border-[#30363d] px-3 flex items-center justify-between text-[10px] text-[#6e7681] bg-[#161b22]">
        <span className="uppercase">{language}</span>
        <span>UTF-8 · {lines.length} lines · {value.length} chars</span>
      </div>
    </div>
  );
}
