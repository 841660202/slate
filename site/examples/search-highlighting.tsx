import React, { useState, useCallback, useMemo } from 'react'
import { Slate, Editable, withReact } from 'slate-react'
import { Text, Descendant, createEditor } from 'slate'
import { css } from '@emotion/css'
import { withHistory } from 'slate-history'

import { Icon, Toolbar } from '../components'
// 在 Slate.js 编辑器中，`decorate` 是一个用于装饰文本节点的函数。装饰是一种在文本节点上应用样式或标记的方式，通常用于显示特定的文本范围，比如高亮关键词、添加链接等。

// 在 Slate.js 中，`decorate` 函数的作用是返回一组装饰器范围，每个装饰器范围都是一个包含以下属性的对象：

// - `anchor`: 装饰器的起始位置（`Point` 对象）。
// - `focus`: 装饰器的结束位置（`Point` 对象）。
// - `mark`: 应用于范围的标记（`Mark` 对象）。

// 你可以在 `decorate` 函数中根据你的需求创建装饰器范围，并将其应用于文本节点。装饰器的用途可以多样化，比如用于语法高亮、关键词标记、拼写检查等。

// 以下是一个简单的示例，演示了如何在 Slate.js 编辑器中使用 `decorate` 函数：

// ```javascript
// import { Editor, Range, Text } from 'slate';

// const MyEditor = () => {
//   const decorate = ([node, path]) => {
//     const ranges = [];

//     if (Text.isText(node)) {
//       const text = node.text;
//       const pattern = /@(\w+)/g;
//       let match;

//       while ((match = pattern.exec(text)) !== null) {
//         const start = match.index;
//         const end = start + match[0].length;

//         ranges.push({
//           anchor: { path, offset: start },
//           focus: { path, offset: end },
//           mark: { type: 'mention', data: { username: match[1] } },
//         });
//       }
//     }

//     return ranges;
//   };

//   return (
//     <Editor
//       decorate={decorate}
//       // ... other props
//     />
//   );
// };
// ```

// 在这个示例中，`decorate` 函数会在文本节点中查找以 "@" 开头的单词，并将这些范围标记为 `mention` 类型的装饰器。

// 请注意，`decorate` 函数是 Slate.js 中强大的一部分，可以根据你的需求进行灵活的定制。你可以使用它来创建自定义的文本样式、链接等装饰效果。
const SearchHighlightingExample = () => {
  const [search, setSearch] = useState<string | undefined>()
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  const decorate = useCallback(
    ([node, path]) => {
      // {
      //   "text": "Try it out for yourself by typing in the search box above!"
      // }
      console.log('node, path', node, path)
      const ranges = []

      if (search && Text.isText(node)) {
        const { text } = node
        const parts = text.split(search)
        let offset = 0

        parts.forEach((part, i) => {
          if (i !== 0) {
            ranges.push({
              anchor: { path, offset: offset - search.length },
              focus: { path, offset },
              highlight: true,
            })
          }

          offset = offset + part.length + search.length
        })
      }

      return ranges
    },
    [search]
  )

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Toolbar>
        <div
          className={css`
            position: relative;
          `}
        >
          <Icon
            className={css`
              position: absolute;
              top: 0.3em;
              left: 0.4em;
              color: #ccc;
            `}
          >
            search
          </Icon>
          <input
            type="search"
            placeholder="Search the text..."
            onChange={e => setSearch(e.target.value)}
            className={css`
              padding-left: 2.5em;
              width: 100%;
            `}
          />
        </div>
      </Toolbar>
      <Editable decorate={decorate} renderLeaf={props => <Leaf {...props} />} />
    </Slate>
  )
}

const Leaf = ({ attributes, children, leaf }) => {
  console.log('{ attributes, children, leaf }', { attributes, children, leaf })
  return (
    <span
      {...attributes}
      {...(leaf.highlight && { 'data-cy': 'search-highlighted' })}
      className={css`
        font-weight: ${leaf.bold && 'bold'};
        background-color: ${leaf.highlight && '#ffeeba'};
      `}
    >
      {children}
    </span>
  )
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph', // path: 0
    children: [
      {
        // path: 0,0
        text:
          'This is editable text that you can search. As you search, it looks for matching strings of text, and adds ',
      },
      { text: 'decorations', bold: true }, // path: 0,1
      { text: ' to them in realtime.' }, // path: 0,2
    ],
  },
  {
    type: 'paragraph', // path: 1
    children: [
      {
        // path: 1,0
        text: 'Try it out for yourself by typing in the search box above!',
      },
    ],
  },
]

export default SearchHighlightingExample
