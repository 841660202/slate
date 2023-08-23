import React, { useMemo, useCallback } from 'react'
import {
  Slate,
  Editable,
  withReact,
  useSlateStatic,
  useReadOnly,
  ReactEditor,
} from 'slate-react'
import {
  Editor,
  Transforms,
  Range,
  Point,
  createEditor,
  Descendant,
  Element as SlateElement,
} from 'slate'
import { css } from '@emotion/css'
import { withHistory } from 'slate-history'

const initialValue: Descendant[] = [
  {
    type: 'paragraph', // path: 0
    children: [
      {
        text:
          'With Slate you can build complex block types that have their own embedded content and behaviors, like rendering checkboxes inside check list items!',
      },
    ],
  },
  {
    type: 'check-list-item', // path: 1
    checked: true,
    children: [{ text: 'Slide to the left.' }],
  },
  {
    type: 'check-list-item', // path: 2
    checked: true,
    children: [{ text: 'Slide to the right.' }],
  },
  {
    type: 'check-list-item', // path: 3
    checked: false,
    children: [{ text: 'Criss-cross.' }],
  },
  {
    type: 'check-list-item', // path: 4
    checked: true,
    children: [{ text: 'Criss-cross!' }],
  },
  {
    type: 'check-list-item', // path: 5
    checked: false,
    children: [{ text: 'Cha cha real smooth…' }],
  },
  {
    type: 'check-list-item', // path: 6
    checked: false,
    children: [{ text: "Let's go to work!" }],
  },
  {
    type: 'paragraph', // path: 7
    children: [{ text: 'Try it out for yourself!' }],
  },
]

const CheckListsExample = () => {
  const renderElement = useCallback(props => <Element {...props} />, [])
  const editor = useMemo(
    () => withChecklists(withHistory(withReact(createEditor()))),
    []
  )

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable
        renderElement={renderElement}
        placeholder="Get to work…"
        spellCheck
        autoFocus
      />
    </Slate>
  )
}

const withChecklists = editor => {
  const { deleteBackward } = editor
  // 总之，这段代码的作用是，当光标位于一个待办事项（check-list-item）的开头时，按下删除键时将该待办事项转换为段落。
  // 这样，可以在编辑待办事项的内容时，按下删除键一次即可删除整个待办事项而不是删除其中的文本。
  editor.deleteBackward = (...args) => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const [match] = Editor.nodes(editor, {
        match: n =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          n.type === 'check-list-item',
      })

      if (match) {
        const [, path] = match
        console.log('===tag match', match)
        const start = Editor.start(editor, path)
        console.log('===tag start', start)
        if (Point.equals(selection.anchor, start)) {
          debugger
          const newProperties: Partial<SlateElement> = {
            type: 'paragraph',
          }
          Transforms.setNodes(editor, newProperties, {
            match: n =>
              !Editor.isEditor(n) &&
              SlateElement.isElement(n) &&
              n.type === 'check-list-item',
          })
          return
        }
      }
    }

    deleteBackward(...args)
  }

  return editor
}

const Element = props => {
  const { attributes, children, element } = props

  switch (element.type) {
    case 'check-list-item':
      return <CheckListItemElement {...props} />
    default:
      return <p {...attributes}>{children}</p>
  }
}

const CheckListItemElement = ({ attributes, children, element }) => {
  const editor = useSlateStatic()
  const readOnly = useReadOnly()
  const { checked } = element
  return (
    <div
      {...attributes}
      className={css`
        display: flex;
        flex-direction: row;
        align-items: center;

        & + & {
          margin-top: 0;
        }
      `}
    >
      <span
        contentEditable={false}
        className={css`
          margin-right: 0.75em;
        `}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={event => {
            console.log('===tag element', element)
            const path = ReactEditor.findPath(editor, element)
            const newProperties: Partial<SlateElement> = {
              checked: event.target.checked,
            }
            Transforms.setNodes(editor, newProperties, { at: path })
          }}
        />
      </span>
      <span
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className={css`
          flex: 1;
          opacity: ${checked ? 0.666 : 1};
          text-decoration: ${!checked ? 'none' : 'line-through'};

          &:focus {
            outline: none;
          }
        `}
      >
        {children}
      </span>
    </div>
  )
}

export default CheckListsExample
