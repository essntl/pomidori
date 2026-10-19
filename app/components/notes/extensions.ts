import { Extension, Node, mergeAttributes, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { SlashMenu, type SlashMenuHandle } from "./SlashMenu";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: () => ReturnType;
    };
  }
}

/** A highlighted box for tips and side notes. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), ["div", 0]];
  },
  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});

export type SlashItem = {
  title: string;
  description: string;
  icon: string;
  keywords: string;
  run: (editor: Editor, range: Range) => void;
};

const block = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

export const SLASH_ITEMS: SlashItem[] = [
  { title: "Text", description: "Plain paragraph", icon: "Aa", keywords: "paragraph p", run: (e, r) => block(e, r).setParagraph().run() },
  { title: "Heading 1", description: "Big section heading", icon: "H1", keywords: "h1 title", run: (e, r) => block(e, r).setHeading({ level: 1 }).run() },
  { title: "Heading 2", description: "Medium heading", icon: "H2", keywords: "h2 subtitle", run: (e, r) => block(e, r).setHeading({ level: 2 }).run() },
  { title: "Heading 3", description: "Small heading", icon: "H3", keywords: "h3", run: (e, r) => block(e, r).setHeading({ level: 3 }).run() },
  { title: "To-do list", description: "Track tasks with checkboxes", icon: "☑", keywords: "todo task check", run: (e, r) => block(e, r).toggleTaskList().run() },
  { title: "Bulleted list", description: "Simple bullet points", icon: "•", keywords: "ul unordered bullet", run: (e, r) => block(e, r).toggleBulletList().run() },
  { title: "Numbered list", description: "Ordered steps", icon: "1.", keywords: "ol ordered number", run: (e, r) => block(e, r).toggleOrderedList().run() },
  { title: "Quote", description: "Capture a quotation", icon: "❝", keywords: "blockquote cite", run: (e, r) => block(e, r).toggleBlockquote().run() },
  { title: "Callout", description: "Make writing stand out", icon: "💡", keywords: "note tip info box", run: (e, r) => block(e, r).toggleCallout().run() },
  { title: "Code", description: "Code snippet", icon: "</>", keywords: "codeblock pre snippet", run: (e, r) => block(e, r).toggleCodeBlock().run() },
  { title: "Divider", description: "Visual separator", icon: "—", keywords: "hr rule line separator", run: (e, r) => block(e, r).setHorizontalRule().run() },
  {
    title: "Table",
    description: "3 × 3 grid",
    icon: "▦",
    keywords: "grid table columns",
    run: (e, r) => block(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

function filterItems(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((i) => i.title.toLowerCase().includes(q) || i.keywords.includes(q));
}

const slashKey = new PluginKey("slash-command");

/** "/" opens a block menu, Notion style. */
export const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: slashKey,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        allow: ({ state, range }) => {
          // Not inside code blocks.
          const $from = state.doc.resolve(range.from);
          return $from.parent.type.name !== "codeBlock";
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle, SuggestionProps<SlashItem, SlashItem>> | null = null;

          const place = (props: SuggestionProps<SlashItem, SlashItem>) => {
            const rect = props.clientRect?.();
            const el = component?.element as HTMLElement | undefined;
            if (!rect || !el) return;
            computePosition({ getBoundingClientRect: () => rect }, el, {
              placement: "bottom-start",
              strategy: "fixed",
              middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
            }).then(({ x, y }) => {
              Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
            });
          };

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, { props, editor: props.editor });
              const el = component.element as HTMLElement;
              Object.assign(el.style, { position: "fixed", zIndex: "80", left: "0px", top: "0px" });
              document.body.appendChild(el);
              place(props);
            },
            onUpdate: (props) => {
              component?.updateProps(props);
              place(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                component?.destroy();
                component?.element.remove();
                component = null;
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              component?.element.remove();
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
