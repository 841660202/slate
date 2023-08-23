import React, { useCallback, useMemo } from 'react'
import { Slate, Editable, withReact } from 'slate-react'
import {
  Editor,
  Range,
  Point,
  Descendant,
  createEditor,
  Element as SlateElement,
} from 'slate'
import { withHistory } from 'slate-history'

const TablesExample = () => {
  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback(props => <Leaf {...props} />, [])
  const editor = useMemo(
    () => withTables(withHistory(withReact(createEditor()))),
    []
  )
  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable renderElement={renderElement} renderLeaf={renderLeaf} />
    </Slate>
  )
}

const withTables = editor => {
  const { deleteBackward, deleteForward, insertBreak } = editor
  // 在 Slate 编辑器中，`editor.deleteBackward` 和 `editor.deleteForward` 是两个不同的函数，用于处理删除操作。它们之间的区别在于删除的方向：

  // 1. `editor.deleteBackward`：这个函数用于处理从当前光标位置向前删除的操作。通常用于 Backspace 键或 Delete 键的操作。例如，当你按下 Backspace 键时，它会删除光标前面的内容。

  // 2. `editor.deleteForward`：这个函数用于处理从当前光标位置向后删除的操作。通常用于 Delete 键的操作。例如，当你按下 Delete 键时，它会删除光标后面的内容。

  // 这两个函数可以在 Slate 编辑器中进行自定义以实现不同的删除行为。你可以根据特定的需求重写它们，以实现编辑器中的特定删除逻辑。
  editor.deleteBackward = unit => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const [cell] = Editor.nodes(editor, {
        match: n =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          n.type === 'table-cell',
      })

      if (cell) {
        const [, cellPath] = cell
        const start = Editor.start(editor, cellPath)

        if (Point.equals(selection.anchor, start)) {
          return
        }
      }
    }

    deleteBackward(unit)
  }
  // 这段代码的作用是在特定情况下，当焦点位于单元格的末尾时，阻止了向前删除操作的执行

  //   这段代码看起来是在 Slate 编辑器中重写了 `editor.deleteForward` 函数，以实现一些特定的删除行为。代码的逻辑如下：

  // 1. 获取当前编辑器的选区信息 `selection`。
  // 2. 如果选区存在并且是一个折叠选区（collapsed selection），则继续下面的处理。
  // 3. 使用 `Editor.nodes` 函数来查找编辑器中的块元素，匹配类型为 `'table-cell'` 的单元格元素（`table-cell` 可能是你的自定义块类型）。
  // 4. 如果找到了单元格元素（`cell`），获取其路径 `cellPath`。
  // 5. 使用 `Editor.end` 函数来获取单元格的结束位置。
  // 6. 检查选区的锚点是否与单元格的结束位置相同，如果是，则返回，即不执行删除操作。

  // 总体来说，这段代码的作用是在特定情况下，当焦点位于单元格的末尾时，阻止了向前删除操作的执行。
  // 在单元格中的时候，当鼠标变成一个光标点时候，不进行删除
  // 如果有任何其他问题或需要更多解释，请随时问我。
  editor.deleteForward = unit => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const [cell] = Editor.nodes(editor, {
        match: n =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          n.type === 'table-cell',
      })

      if (cell) {
        const [, cellPath] = cell
        const end = Editor.end(editor, cellPath)

        if (Point.equals(selection.anchor, end)) {
          return
        }
      }
    }

    deleteForward(unit)
  }

  editor.insertBreak = () => {
    const { selection } = editor

    if (selection) {
      const [table] = Editor.nodes(editor, {
        match: n =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          n.type === 'table',
      })

      if (table) {
        return
      }
    }

    insertBreak()
  }

  return editor
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'table':
      return (
        <table>
          <tbody {...attributes}>{children}</tbody>
        </table>
      )
    case 'table-row':
      return <tr {...attributes}>{children}</tr>
    case 'table-cell':
      return <td {...attributes}>{children}</td>
    default:
      return <p {...attributes}>{children}</p>
  }
}

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>
  }

  return <span {...attributes}>{children}</span>
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Since the editor is based on a recursive tree model, similar to an HTML document, you can create complex nested structures, like tables:',
      },
    ],
  },
  {
    type: 'table',
    children: [
      {
        type: 'table-row',
        children: [
          {
            type: 'table-cell',
            children: [{ text: '' }],
          },
          {
            type: 'table-cell',
            children: [{ text: 'Human', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: 'Dog', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: 'Cat', bold: true }],
          },
        ],
      },
      {
        type: 'table-row',
        children: [
          {
            type: 'table-cell',
            children: [{ text: '# of Feet', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: '2' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '4' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '4' }],
          },
        ],
      },
      {
        type: 'table-row',
        children: [
          {
            type: 'table-cell',
            children: [{ text: '# of Lives', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: '1' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '1' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '9' }],
          },
        ],
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          "This table is just a basic example of rendering a table, and it doesn't have fancy functionality. But you could augment it to add support for navigating with arrow keys, displaying table headers, adding column and rows, or even formulas if you wanted to get really crazy!",
      },
    ],
  },
]

export default TablesExample
