'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ButtonGroup, { type ButtonGroupProps } from '@cloudscape-design/components/button-group';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type IconKey, svg } from '@/components/icons';
import { uploadBlogImage } from './blogImage';

const BLOCKS = ['paragraph', 'h2', 'h3', 'h4'] as const;
const ALIGNS = [
  { side: 'left', id: 'alignLeft' },
  { side: 'center', id: 'alignCenter' },
  { side: 'right', id: 'alignRight' },
] as const;
const TABLE_ACTIONS = ['insertTable', 'addRowAfter', 'addColumnAfter', 'deleteRow', 'deleteColumn', 'deleteTable'] as const;

type Props = { toolbarHost: HTMLElement | null; value: string; onChange: (html: string) => void; onError: (message: string) => void; label: string };

export function RichTextEditor({ toolbarHost, value, onChange, onError, label }: Props) {
  const t = useTranslations('platform.blog.editor');
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: value,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: false } }),
      Image,
      TableKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    editorProps: {
      attributes: { class: 'vw-prose', 'aria-label': label, 'aria-multiline': 'true', role: 'textbox' },
      handlePaste: (_view, event) => dropImages(event.clipboardData?.files),
      handleDrop: (_view, event) => dropImages(event.dataTransfer?.files),
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML()),
  });

  async function insertImage(file: File) {
    setUploading(true);
    const result = await uploadBlogImage(file);
    setUploading(false);
    if ('error' in result) return onError(result.error);
    editor?.chain().focus().setImage({ src: result.url, alt: file.name.replace(/\.[^.]+$/, '') }).run();
  }

  function dropImages(files?: FileList | null) {
    const images = [...(files ?? [])].filter((file) => file.type.startsWith('image/'));
    for (const file of images) void insertImage(file);
    return images.length > 0;
  }

  if (!editor) return <Box color="text-status-inactive">{t('loading')}</Box>;

  const chain = () => editor.chain().focus();
  const toggle = (id: string, text: string, icon: IconKey, active: boolean): ButtonGroupProps.Item => ({
    type: 'icon-toggle-button',
    id,
    text,
    pressed: active,
    iconSvg: svg(icon),
    pressedIconSvg: svg(icon, true),
  });
  const press = (id: string, text: string, icon: IconKey, disabled = false): ButtonGroupProps.IconButton => ({
    type: 'icon-button',
    id,
    text,
    disabled,
    iconSvg: svg(icon),
  });

  const run: Record<string, () => unknown> = {
    bold: () => chain().toggleBold().run(),
    italic: () => chain().toggleItalic().run(),
    underline: () => chain().toggleUnderline().run(),
    strike: () => chain().toggleStrike().run(),
    bulletList: () => chain().toggleBulletList().run(),
    orderedList: () => chain().toggleOrderedList().run(),
    quote: () => chain().toggleBlockquote().run(),
    link: () => setLink((editor.getAttributes('link').href as string | undefined) ?? ''),
    unlink: () => chain().unsetLink().run(),
    image: () => picker.current?.click(),
    alignLeft: () => chain().setTextAlign('left').run(),
    alignCenter: () => chain().setTextAlign('center').run(),
    alignRight: () => chain().setTextAlign('right').run(),
    undo: () => chain().undo().run(),
    redo: () => chain().redo().run(),
    clear: () => chain().unsetAllMarks().clearNodes().run(),
    insertTable: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    addRowAfter: () => chain().addRowAfter().run(),
    addColumnAfter: () => chain().addColumnAfter().run(),
    deleteRow: () => chain().deleteRow().run(),
    deleteColumn: () => chain().deleteColumn().run(),
    deleteTable: () => chain().deleteTable().run(),
  };

  const inTable = editor.isActive('table');
  const block =
    BLOCKS.find((value) => (value === 'paragraph' ? editor.isActive('paragraph') : editor.isActive('heading', { level: Number(value[1]) }))) ?? 'paragraph';
  const items: ButtonGroupProps.ItemOrGroup[] = [
    {
      type: 'group',
      text: t('groups.text'),
      items: [
        toggle('bold', t('bold'), 'bold', editor.isActive('bold')),
        toggle('italic', t('italic'), 'italic', editor.isActive('italic')),
        toggle('underline', t('underline'), 'underline', editor.isActive('underline')),
        toggle('strike', t('strike'), 'strikethrough', editor.isActive('strike')),
      ],
    },
    {
      type: 'group',
      text: t('groups.blocks'),
      items: [
        toggle('bulletList', t('bulletList'), 'bulletList', editor.isActive('bulletList')),
        toggle('orderedList', t('orderedList'), 'numberedList', editor.isActive('orderedList')),
        toggle('quote', t('quote'), 'quote', editor.isActive('blockquote')),
      ],
    },
    {
      type: 'group',
      text: t('groups.insert'),
      items: [
        toggle('link', t('link'), 'link', editor.isActive('link')),
        press('unlink', t('unlink'), 'unlink', !editor.isActive('link')),
        { ...press('image', t('image'), 'image'), loading: uploading, loadingText: t('uploading') },
        {
          type: 'menu-dropdown',
          id: 'table',
          text: t('table'),
          iconSvg: svg('table'),
          items: TABLE_ACTIONS.map((id) => ({ id, text: t(`tableActions.${id}`), disabled: id !== 'insertTable' && !inTable })),
        },
      ],
    },
    {
      type: 'group',
      text: t('groups.align'),
      items: ALIGNS.map(({ side, id }) => toggle(id, t(`align.${side}`), id, editor.isActive({ textAlign: side }))),
    },
    {
      type: 'group',
      text: t('groups.history'),
      items: [
        press('undo', t('undo'), 'undo', !editor.can().undo()),
        press('redo', t('redo'), 'redo', !editor.can().redo()),
        press('clear', t('clear'), 'clearFormatting'),
      ],
    },
  ];

  function applyLink() {
    const href = (link ?? '').trim();
    setLink(null);
    if (!href) return void chain().extendMarkRange('link').unsetLink().run();
    chain()
      .extendMarkRange('link')
      .setLink({ href: /^(https?:|mailto:)/i.test(href) ? href : `https://${href}` })
      .run();
  }

  const toolbar = (
    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
      <Select
        expandToViewport
        ariaLabel={t('block')}
        selectedOption={{ value: block, label: t(`blocks.${block}`) }}
        options={BLOCKS.map((value) => ({ value, label: t(`blocks.${value}`) }))}
        onChange={({ detail }) => {
          const next = detail.selectedOption.value;
          if (next === 'paragraph') chain().setParagraph().run();
          else chain().setHeading({ level: Number(next?.[1]) as 2 | 3 | 4 }).run();
        }}
      />
      <ButtonGroup variant="icon" ariaLabel={t('toolbar')} items={items} onItemClick={({ detail }) => void run[detail.id]?.()} />
    </SpaceBetween>
  );

  return (
    <div className="vw-editor">
      {toolbarHost && createPortal(toolbar, toolbarHost)}
      <EditorContent editor={editor} />
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void insertImage(file);
        }}
      />
      <Modal
        visible={link !== null}
        header={t('linkTitle')}
        closeAriaLabel={t('cancel')}
        onDismiss={() => setLink(null)}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setLink(null)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={applyLink}>
                {t('apply')}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label={t('linkAddress')} constraintText={t('linkHint')}>
          <Input autoFocus type="url" value={link ?? ''} onChange={({ detail }) => setLink(detail.value)} onKeyDown={({ detail }) => detail.key === 'Enter' && applyLink()} />
        </FormField>
      </Modal>
    </div>
  );
}
