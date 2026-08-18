import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { RichTextProfile } from './RichText';

/**
 * TipTap 本體。**只被 `RichText.tsx` 以 `React.lazy` 載入** ——
 * ProseMirror 一整套約 400KB，而後台大部分畫面根本沒有富文字欄位
 * （打包體積計入 SWA Free 的 250MB，見 CLAUDE.md §5.2a）。
 *
 * <p>
 * ⚠️ **工具列必須與伺服器的白名單一致**（`Api/Services/HtmlSanitizers.cs`）。
 * 多給一顆按鈕的後果不是報錯，是編輯者按了、存了、然後那個標籤在儲存時被靜默剝掉 ——
 * 畫面上的內容與資料庫裡的不一樣，而且沒有任何訊息。
 * </p>
 */
const TOOLBAR: Record<RichTextProfile, string[]> = {
  // p / strong / em / ul / ol / li / a
  section: ['bold', 'italic', 'bullet', 'ordered', 'link'],
  // 另加 h2 / h3 / blockquote（figure / img 由內容貼入，編輯器不提供插入）
  article: ['h2', 'h3', 'bold', 'italic', 'bullet', 'ordered', 'quote', 'link'],
  // p / strong / em / ul / ol / li / a / h2 / h3
  legal: ['h2', 'h3', 'bold', 'italic', 'bullet', 'ordered', 'link'],
};

const LABEL: Record<string, string> = {
  h2: 'H2',
  h3: 'H3',
  bold: '粗體',
  italic: '斜體',
  bullet: '項目',
  ordered: '編號',
  quote: '引言',
  link: '連結',
};

export default function RichTextEditor({
  value,
  profile,
  onChange,
}: {
  value: string;
  profile: RichTextProfile;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 白名單裡沒有的節點就不要讓編輯器產生
        heading: profile === 'section' ? false : { levels: [2, 3] },
        blockquote: profile === 'article' ? undefined : false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'rte-content' },
    },
    onUpdate: ({ editor }) => {
      // 空的編輯器回傳 '<p></p>'，那不是「有內容」——
      // 有些欄位（免責聲明）是靠空值決定要不要套用全站預設文字的
      const html = editor.getHTML();
      onChange(editor.isEmpty ? '' : html);
    },
  });

  // 外部換了資料（切語系、載入完成）要跟著換，但不要打斷正在打字的人
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="form-control" style={{ minHeight: '8rem' }} />;

  const buttons = TOOLBAR[profile];

  const run = (key: string) => {
    const chain = editor.chain().focus();
    switch (key) {
      case 'h2':
        return chain.toggleHeading({ level: 2 }).run();
      case 'h3':
        return chain.toggleHeading({ level: 3 }).run();
      case 'bold':
        return chain.toggleBold().run();
      case 'italic':
        return chain.toggleItalic().run();
      case 'bullet':
        return chain.toggleBulletList().run();
      case 'ordered':
        return chain.toggleOrderedList().run();
      case 'quote':
        return chain.toggleBlockquote().run();
      case 'link': {
        if (editor.isActive('link')) return chain.unsetLink().run();
        // http:// 不在伺服器的允許清單內（只有 https / mailto / tel 與站內相對路徑），
        // 貼了會在存檔時被拿掉 href，只剩一段沒有連結的文字
        const url = window.prompt('連結網址（https:／mailto:／tel: 或站內路徑 /en/...）', 'https://');
        if (!url) return false;
        if (/^http:\/\//i.test(url)) {
          window.alert('http:// 的連結會在存檔時被移除。請改用 https://。');
          return false;
        }
        return chain.setLink({ href: url }).run();
      }
      default:
        return false;
    }
  };

  const active = (key: string) =>
    ({
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'),
      link: editor.isActive('link'),
    })[key] ?? false;

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {buttons.map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn-sm ${active(key) ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={active(key)}
            onClick={() => run(key)}
          >
            {LABEL[key]}
          </button>
        ))}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
