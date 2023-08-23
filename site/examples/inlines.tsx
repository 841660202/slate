import React, { useMemo } from 'react'
import isUrl from 'is-url'
import { isKeyHotkey } from 'is-hotkey'
import { css } from '@emotion/css'
import { Editable, withReact, useSlate, useSelected } from 'slate-react'
import * as SlateReact from 'slate-react'
import {
  Transforms,
  Editor,
  Range,
  createEditor,
  Element as SlateElement,
  Descendant,
} from 'slate'
import { withHistory } from 'slate-history'
import { LinkElement, ButtonElement } from './custom-types'

import { Button, Icon, Toolbar } from '../components'

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'In addition to block nodes, you can create inline nodes. Here is a ',
      },
      {
        type: 'link',
        url: 'https://en.wikipedia.org/wiki/Hypertext',
        children: [{ text: 'hyperlink' }],
      },
      {
        text: ', and here is a more unusual inline: an ',
      },
      {
        type: 'button',
        children: [{ text: 'editable button' }],
      },
      {
        text: '! Here is a read-only inline: ',
      },
      {
        type: 'badge',
        children: [{ text: 'Approved' }],
      },
      {
        text: '.',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'There are two ways to add links. You can either add a link via the toolbar icon above, or if you want in on a little secret, copy a URL to your keyboard and paste it while a range of text is selected. ',
      },
      // The following is an example of an inline at the end of a block.
      // This is an edge case that can cause issues.
      {
        type: 'link',
        url: 'https://twitter.com/JustMissEmma/status/1448679899531726852',
        children: [{ text: 'Finally, here is our favorite dog video.' }],
      },
      { text: '' },
    ],
  },
]
const InlinesExample = () => {
  const editor = useMemo(
    () => withInlines(withHistory(withReact(createEditor()))),
    []
  )

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = event => {
    const { selection } = editor

    // Default left/right behavior is unit:'character'.
    // This fails to distinguish between two cursor positions, such as
    // <inline>foo<cursor/></inline> vs <inline>foo</inline><cursor/>.
    // Here we modify the behavior to unit:'offset'.
    // This lets the user step into and out of the inline without stepping over characters.
    // You may wish to customize this further to only use unit:'offset' in specific cases.
    if (selection && Range.isCollapsed(selection)) {
      const { nativeEvent } = event
      if (isKeyHotkey('left', nativeEvent)) {
        event.preventDefault()
        Transforms.move(editor, { unit: 'offset', reverse: true })
        return
      }
      if (isKeyHotkey('right', nativeEvent)) {
        event.preventDefault()
        Transforms.move(editor, { unit: 'offset' })
        return
      }
    }
  }

  return (
    <SlateReact.Slate editor={editor} initialValue={initialValue}>
      <Toolbar>
        <AddLinkButton />
        <RemoveLinkButton />
        <ToggleEditableButtonButton />
      </Toolbar>
      <Editable
        renderElement={props => <Element {...props} />}
        renderLeaf={props => <Text {...props} />}
        placeholder="Enter some text..."
        onKeyDown={onKeyDown}
      />
    </SlateReact.Slate>
  )
}

const withInlines = editor => {
  const {
    insertData,
    insertText,
    isInline,
    isElementReadOnly,
    isSelectable,
  } = editor

  editor.isInline = element =>
    ['link', 'button', 'badge'].includes(element.type) || isInline(element)

  editor.isElementReadOnly = element =>
    element.type === 'badge' || isElementReadOnly(element)

  editor.isSelectable = element =>
    element.type !== 'badge' && isSelectable(element)

  editor.insertText = text => {
    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertText(text)
    }
  }

  editor.insertData = data => {
    const text = data.getData('text/plain')

    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertData(data)
    }
  }

  return editor
}

const insertLink = (editor, url) => {
  if (editor.selection) {
    wrapLink(editor, url)
  }
}

const insertButton = editor => {
  if (editor.selection) {
    wrapButton(editor)
  }
}

const isLinkActive = editor => {
  const [link] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  })
  return !!link
}

const isButtonActive = editor => {
  const [button] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'button',
  })
  return !!button
}

const unwrapLink = editor => {
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  })
}

const unwrapButton = editor => {
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'button',
  })
}
// 这段代码实现了在 Slate 编辑器中添加链接的功能。具体来说，`wrapLink` 函数接受一个编辑器实例和一个链接的 URL 作为参数，然后执行以下步骤：

// 1. 检查是否已经存在活动的链接（即光标处于链接内）。如果存在，先解除链接。
// 2. 获取编辑器的当前选区（selection）。
// 3. 检查选区是否是折叠状态（即光标处于一个点上，没有选中文本）。
// 4. 创建一个链接元素（LinkElement）对象，其中包括类型为 `'link'`，URL 为给定的 URL，以及一个包含链接文本的子节点（如果选区是折叠状态）。
// 5. 根据选区的状态，执行以下操作：
//    - 如果选区是折叠状态，使用 `Transforms.insertNodes` 将链接元素插入到当前光标位置。
//    - 如果选区不是折叠状态，使用 `Transforms.wrapNodes` 将链接元素包裹在选区的范围内，并设置 `split: true` 以确保链接正确分割，然后使用 `Transforms.collapse` 将光标移动到链接后面。

// 总之，`wrapLink` 函数用于在 Slate 编辑器中添加链接，无论是在选区中插入链接文本还是将已有文本包裹成链接。
const wrapLink = (editor, url: string) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const link: LinkElement = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, link)
  } else {
    Transforms.wrapNodes(editor, link, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

const wrapButton = editor => {
  if (isButtonActive(editor)) {
    unwrapButton(editor)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)

  // 插入一个元素类型，并初始化默认展示
  const button: ButtonElement = {
    type: 'button',
    children: isCollapsed ? [{ text: 'Edit me!' }] : [],
  }

  // 选中起止点重合
  if (isCollapsed) {
    Transforms.insertNodes(editor, button)
    // 选中起止点不重合
  } else {
    Transforms.wrapNodes(editor, button, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
const InlineChromiumBugfix = () => (
  <span
    contentEditable={false}
    className={css`
      font-size: 0;
    `}
  >
    {/* `String.fromCodePoint(160)` 的结果是一个非断行空格字符。在 Unicode 中，编码点 160 对应于非断行空格（Non-Breaking Space），通常用于在排版中保持两个单词不会因为换行而断开，而仍然保持在同一行上。

这个字符在 HTML 中可以表示为 `&nbsp;` 实体。在某些情况下，它可能被用于制造空间，使得元素在没有实际内容的情况下也能够被渲染出来。

需要注意的是，这个字符与普通空格字符（编码点 32）在显示效果上有所不同，它不会被自动折叠成单个空格，而是会保持其原始的宽度。 */}
    {String.fromCodePoint(160) /* Non-breaking space */}
  </span>
)

const LinkComponent = ({ attributes, children, element }) => {
  const selected = useSelected()
  return (
    <a
      {...attributes}
      href={element.url}
      className={
        selected
          ? css`
              box-shadow: 0 0 0 3px #ddd;
            `
          : ''
      }
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </a>
  )
}

const EditableButtonComponent = ({ attributes, children }) => {
  return (
    /*
      Note that this is not a true button, but a span with button-like CSS.
      True buttons are display:inline-block, but Chrome and Safari
      have a bad bug with display:inline-block inside contenteditable:
      - https://bugs.webkit.org/show_bug.cgi?id=105898
      - https://bugs.chromium.org/p/chromium/issues/detail?id=1088403
      Worse, one cannot override the display property: https://github.com/w3c/csswg-drafts/issues/3226
      The only current workaround is to emulate the appearance of a display:inline button using CSS.
    */
    <span
      {...attributes}
      onClick={ev => ev.preventDefault()}
      // Margin is necessary to clearly show the cursor adjacent to the button
      className={css`
        margin: 0 0.1em;

        background-color: #efefef;
        padding: 2px 6px;
        border: 1px solid #767676;
        border-radius: 2px;
        font-size: 0.9em;
      `}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </span>
  )
}

const BadgeComponent = ({ attributes, children, element }) => {
  const selected = useSelected()

  return (
    <span
      {...attributes}
      contentEditable={false}
      className={css`
        background-color: green;
        color: white;
        padding: 2px 6px;
        border-radius: 2px;
        font-size: 0.9em;
        ${selected && 'box-shadow: 0 0 0 3px #ddd;'}
      `}
      data-playwright-selected={selected}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </span>
  )
}

const Element = props => {
  const { attributes, children, element } = props
  switch (element.type) {
    case 'link':
      return <LinkComponent {...props} />
    case 'button':
      return <EditableButtonComponent {...props} />
    case 'badge':
      return <BadgeComponent {...props} />
    default:
      return <p {...attributes}>{children}</p>
  }
}

const Text = props => {
  const { attributes, children, leaf } = props
  return (
    <span
      // The following is a workaround for a Chromium bug where,
      // if you have an inline at the end of a block,
      // clicking the end of a block puts the cursor inside the inline
      // instead of inside the final {text: ''} node
      // https://github.com/ianstormtaylor/slate/issues/4704#issuecomment-1006696364
      className={
        leaf.text === ''
          ? css`
              padding-left: 0.1px;
            `
          : null
      }
      {...attributes}
    >
      {children}
    </span>
  )
}

const AddLinkButton = () => {
  const editor = useSlate()
  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={event => {
        event.preventDefault()
        const url = window.prompt('Enter the URL of the link:')
        if (!url) return
        insertLink(editor, url)
      }}
    >
      <Icon>link</Icon>
    </Button>
  )
}

const RemoveLinkButton = () => {
  const editor = useSlate()

  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={event => {
        if (isLinkActive(editor)) {
          unwrapLink(editor)
        }
      }}
    >
      <Icon>link_off</Icon>
    </Button>
  )
}

const ToggleEditableButtonButton = () => {
  const editor = useSlate()
  return (
    <Button
      active
      onMouseDown={event => {
        event.preventDefault()
        if (isButtonActive(editor)) {
          unwrapButton(editor)
        } else {
          insertButton(editor)
        }
      }}
    >
      <Icon>smart_button</Icon>
    </Button>
  )
}

export default InlinesExample
