import React, { useCallback, useMemo } from 'react'
import {
  createEditor,
  Descendant,
  Editor,
  Element as SlateElement,
  Node as SlateNode,
  Point,
  Range,
  Transforms,
} from 'slate'
import { withHistory } from 'slate-history'
import { Editable, ReactEditor, Slate, withReact } from 'slate-react'
import { BulletedListElement } from './custom-types'

const SHORTCUTS = {
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '>': 'block-quote',
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '####': 'heading-four',
  '#####': 'heading-five',
  '######': 'heading-six',
}

const MarkdownShortcutsExample = () => {
  const renderElement = useCallback(props => <Element {...props} />, [])
  const editor = useMemo(
    () => withShortcuts(withReact(withHistory(createEditor()))),
    []
  )

  // 这段代码看起来是使用 Slate.js 构建的富文本编辑器相关的逻辑，用于处理在 DOM 输入事件之前的操作。让我来解释一下这段代码的主要部分：

  // 让我逐步解释一下这段代码：

  // 1. `handleDOMBeforeInput` 是一个回调函数，用于处理 DOM 的 `beforeinput` 事件。它接收一个输入事件 `e` 作为参数。

  // 2. `queueMicrotask(() => { ... })`：在微任务队列中排队一个函数，以确保这段逻辑在下一个微任务周期中运行。这样可以确保在进行后续的 DOM 渲染之前，这些操作会在文本插入之前执行。

  // 3. `ReactEditor.androidPendingDiffs(editor)`：这是一个 Slate.js 提供的方法，用于获取在 Android 设备上等待提交的文本差异。

  // 4. `pendingDiffs?.some(...)`：对于每个等待提交的文本差异，使用 `some` 方法检查是否满足一些条件。

  // 5. 在条件检查中，首先检查差异文本是否以空格结尾，如果不是，则直接返回 `false`。

  // 6. `SlateNode.leaf(editor, path)`：这是 Slate.js 提供的方法，用于获取指定路径下的叶子节点的信息，包括文本内容。

  // 7. `beforeText` 是将当前差异文本的最后一个字符去掉后的文本。

  // 8. `SHORTCUTS`：这是一个可能在其他地方定义的常量或映射，可能是一些文本快捷方式或命令的标识。

  // 9. `Editor.above(editor, { ... })`：这是 Slate.js 提供的方法，用于获取指定位置上方的节点，这里匹配块级元素。

  // 10. `Editor.isStart(editor, ...)`：这是 Slate.js 提供的方法，用于检查指定位置是否是块级元素的开头。

  // 11. `ReactEditor.androidScheduleFlush(editor)`：这是一个 Slate.js 提供的方法，用于在 Android 设备上调度刷新。

  // 总的来说，这段代码在 Android 设备上处理 `beforeinput` 事件之前的操作，主要是为了判断在特定条件下是否需要调用 `androidScheduleFlush` 来刷新编辑器内容。具体的条件和逻辑根据你的应用和需求而定。

  const handleDOMBeforeInput = useCallback(
    (e: InputEvent) => {
      queueMicrotask(() => {
        const pendingDiffs = ReactEditor.androidPendingDiffs(editor)

        const scheduleFlush = pendingDiffs?.some(({ diff, path }) => {
          if (!diff.text.endsWith(' ')) {
            return false
          }

          const { text } = SlateNode.leaf(editor, path)
          const beforeText = text.slice(0, diff.start) + diff.text.slice(0, -1)
          if (!(beforeText in SHORTCUTS)) {
            return
          }

          const blockEntry = Editor.above(editor, {
            at: path,
            match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
          })
          if (!blockEntry) {
            return false
          }

          const [, blockPath] = blockEntry
          return Editor.isStart(editor, Editor.start(editor, path), blockPath)
        })

        if (scheduleFlush) {
          ReactEditor.androidScheduleFlush(editor)
        }
      })
    },
    [editor]
  )

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable
        onDOMBeforeInput={handleDOMBeforeInput}
        renderElement={renderElement}
        placeholder="Write some markdown..."
        spellCheck
        autoFocus
      />
    </Slate>
  )
}
// 你提供的代码片段是一个 Slate.js 的插件，用于处理 Markdown 快捷键。该插件会覆盖编辑器的 `insertText` 和 `deleteBackward` 方法，以支持在编辑器中处理特定的 Markdown 快捷键操作。

// 以下是代码片段的解释：

// 1. `withShortcuts` 函数接受一个 Slate 编辑器作为参数，并返回经过处理的编辑器。

// 2. 在 `insertText` 方法中，它首先检查输入的文本是否以空格结尾且光标选区是折叠的。如果满足这些条件，它会尝试根据输入的文本和 `SHORTCUTS` 对象来匹配合适的类型。

// 3. 如果找到匹配的类型，它会根据匹配的快捷键进行相应的处理：选择文本范围、删除文本、更新节点属性等。

// 4. 对于特定的类型（如 `'list-item'`），它会添加额外的处理逻辑，如包裹节点。

// 5. 在 `deleteBackward` 方法中，它会检查当前的选择范围是否与匹配的节点的起始位置相同。如果是，它会执行一些处理，如更改节点类型和取消包裹节点。

// 通过这个插件，你可以在 Slate 编辑器中使用 Markdown 快捷键来插入不同类型的内容块或执行其他操作。该插件会根据你提供的 `SHORTCUTS` 对象来判断用户输入的快捷键是否匹配，并执行相应的操作来处理用户的输入。
const withShortcuts = editor => {
  const { deleteBackward, insertText } = editor

  editor.insertText = text => {
    const { selection } = editor

    if (text.endsWith(' ') && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection
      // block 变量通过 Editor.above 方法获取了当前光标所在位置的上方最近的块级元素。
      // { match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n) } 是一个匹配器对象，
      // 它用于指定要寻找的节点的条件。在这里，它通过 SlateElement.isElement(n) 检查节点是否为元素节点（而不是文本节点），并且通过 Editor.isBlock(editor, n) 检查节点是否是块级元素。
      // 如果找到了满足条件的节点，block 变量将包含一个数组 [node, path]，其中 node 是找到的节点，path 是节点的路径
      const block = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      })

      const path = block ? block[1] : []
      // start 变量将包含一个位置对象，该对象表示指定节点的起始位置。这个位置通常是一个包含 path 和 offset 属性的对象，表示节点的路径和在节点内部的偏移量
      // 这段代码用于获取指定节点的起始位置，通常用于操作节点内的文本内容。在这个上下文中，start 可能用于在文本中插入或处理特定文本内容
      const start = Editor.start(editor, path)
      const range = { anchor, focus: start }
      const beforeText = Editor.string(editor, range) + text.slice(0, -1)
      const type = SHORTCUTS[beforeText]

      if (type) {
        // 这段代码的目的是选择编辑器中的指定范围，
        // 然后如果选择是未折叠的，就删除这个范围内的内容。
        // 这可能是在执行一些文本替换或插入操作之前的预处理步骤
        Transforms.select(editor, range)

        if (!Range.isCollapsed(range)) {
          Transforms.delete(editor)
        }

        const newProperties: Partial<SlateElement> = {
          type,
        }
        // 设置节点的type类型

        // 这段代码使用 Slate.js 的 `Transforms.setNodes` 方法来更改选定范围内的节点属性，以实现特定的编辑操作。

        // `Transforms.setNodes` 方法允许你根据给定的匹配条件，将指定的节点属性应用到编辑器中的节点。在这段代码中，它的作用是将选定范围内的节点的属性更新为 `newProperties` 中指定的属性。

        // - `editor`: 编辑器对象。
        // - `newProperties`: 一个对象，包含要更新的节点属性。
        // - `options`: 选项对象，用于匹配要更新的节点。

        // 在这里，选项对象中的 `match` 函数被用来匹配要更新的节点。条件是匹配满足以下两个条件的节点：

        // 1. `n` 是一个 `SlateElement` 元素（即一个编辑器中的块级元素）。
        // 2. `n` 满足 `Editor.isBlock(editor, n)`，即它是一个编辑器的块级元素。

        // 一旦匹配的节点被找到，它们的属性将会被更新为 `newProperties` 中指定的属性。

        // 总之，这段代码用于在选定范围内的块级元素上设置新的属性，以实现特定的编辑操作。
        Transforms.setNodes<SlateElement>(editor, newProperties, {
          match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
        })

        // 这段代码的作用是在特定的情况下，将编辑器中的块级元素包裹在一个新的节点中。具体来说，如果正在插入的文本符合 `SHORTCUTS` 中的某个快捷键，并且对应的快捷键是 `'list-item'`，则会在光标所在位置的块级元素外部包裹一个新的节点，将其转换为列表项。

        // 让我来解释一下这段代码的每一步：

        // 1. 首先，检查当前的 `type` 是否为 `'list-item'`，这是根据你提供的 `SHORTCUTS` 对象确定的。

        // 2. 如果 `type` 是 `'list-item'`，则创建一个新的节点 `list`，它是一个 `BulletedListElement` 类型的对象。这个新节点将包含一个 `type` 属性，值为 `'bulleted-list'`，以及一个空的 `children` 数组。

        // 3. 使用 `Transforms.wrapNodes` 方法将光标所在位置的块级元素包裹在刚刚创建的 `list` 节点中。

        //    - `editor`: 编辑器对象。
        //    - `list`: 要用于包裹的节点。
        //    - `options`: 选项对象，用于匹配要包裹的节点。

        //    在这里，选项对象中的 `match` 函数被用来匹配要包裹的节点。条件是匹配满足以下三个条件的节点：

        //    1. `n` 不是编辑器本身（即不是 `Editor.isEditor(n)`）。
        //    2. `n` 是一个 `SlateElement` 元素（块级元素）。
        //    3. `n` 的 `type` 属性是 `'list-item'`。

        //    一旦匹配的节点被找到，它将被包裹在新的 `list` 节点中。

        // 总之，这段代码用于将光标所在位置的块级元素包裹在一个新的列表项节点中，以实现在文本插入时根据快捷键自动创建列表项的功能。
        if (type === 'list-item') {
          const list: BulletedListElement = {
            type: 'bulleted-list',
            children: [],
          }
          Transforms.wrapNodes(editor, list, {
            match: n =>
              !Editor.isEditor(n) &&
              SlateElement.isElement(n) &&
              n.type === 'list-item',
          })
        }

        return
      }
    }

    insertText(text)
  }
  // 这段代码用于处理在按下退格键时的行为，以实现在编辑器中自动将某些块级元素转换为其他类型的块级元素。

  // 让我来解释一下这段代码的逻辑：

  // 1. 首先，检查是否有文本被选中，并且选中范围是折叠的（即光标位置）。

  // 2. 如果满足上述条件，使用 `Editor.above` 查找光标所在位置上面最近的块级元素。

  // 3. 如果找到了匹配的块级元素，将它和它的路径 `path` 解构出来，并使用 `Editor.start` 获取该块级元素的起始位置。

  // 4. 接下来，检查是否需要进行块级元素的转换。具体而言，如果光标位置与块级元素的起始位置相同，并且块级元素的类型不是 `'paragraph'`，则需要进行转换。在这里，`Point.equals(selection.anchor, start)` 条件用于检查光标是否位于块级元素的起始位置。

  // 5. 如果需要进行转换，使用 `Transforms.setNodes` 方法将块级元素的类型设置为 `'paragraph'`，从而将其转换为普通段落。

  // 6. 如果块级元素的类型是 `'list-item'`，则使用 `Transforms.unwrapNodes` 方法取消对其外部包裹的节点。具体而言，它会找到外部的 `bulleted-list` 节点，并将其取消包裹。`split: true` 选项表示在取消包裹时会保留拆分的部分，即将被取消包裹的节点与其相邻的节点分开。

  // 7. 最后，如果没有进行块级元素的转换，将继续执行默认的 `deleteBackward` 函数。

  // 总之，这段代码实现了在按下退格键时，根据条件将块级元素进行转换或取消包裹的功能，从而实现了在编辑器中的一些快捷操作。
  editor.deleteBackward = (...args) => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      })

      if (match) {
        const [block, path] = match
        const start = Editor.start(editor, path)

        if (
          !Editor.isEditor(block) &&
          SlateElement.isElement(block) &&
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          const newProperties: Partial<SlateElement> = {
            type: 'paragraph',
          }
          Transforms.setNodes(editor, newProperties)

          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === 'bulleted-list',
              split: true,
            })
          }

          return
        }
      }

      deleteBackward(...args)
    }
  }

  return editor
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'heading-three':
      return <h3 {...attributes}>{children}</h3>
    case 'heading-four':
      return <h4 {...attributes}>{children}</h4>
    case 'heading-five':
      return <h5 {...attributes}>{children}</h5>
    case 'heading-six':
      return <h6 {...attributes}>{children}</h6>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    default:
      return <p {...attributes}>{children}</p>
  }
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'The editor gives you full control over the logic you can add. For example, it\'s fairly common to want to add markdown-like shortcuts to editors. So that, when you start a line with "> " you get a blockquote that looks like this:',
      },
    ],
  },
  {
    type: 'block-quote',
    children: [{ text: 'A wise quote.' }],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Order when you start a line with "## " you get a level-two heading, like this:',
      },
    ],
  },
  {
    type: 'heading-two',
    children: [{ text: 'Try it out!' }],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Try it out for yourself! Try starting a new line with ">", "-", or "#"s.',
      },
    ],
  },
]

export default MarkdownShortcutsExample
