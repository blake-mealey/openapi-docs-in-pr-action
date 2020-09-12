'use strict';

const remark = require('remark');
const visit = require('unist-util-visit');
const find = require('unist-util-find');
const is = require('unist-util-is');

const removeUnwantedNodes = () => (tree) => {
  visit(tree, 'html', (node, index, parent) => {
    if (node.value.startsWith('<h1')) {
      parent.children.splice(index, 1);
      return [visit.SKIP, index];
    }
  });
  visit(tree, 'blockquote', (node, index, parent) => {
    const text = find(node, { type: 'text' });
    if (text && text.value.startsWith('Scroll down for')) {
      parent.children.splice(index, 1);
      return [visit.SKIP, index];
    }
  });
};

const wrapOperationsWithDetails = () => (tree) => {
  visit(tree, { type: 'heading', depth: 2 }, (node, index, parent) => {
    parent.children.splice(index + 1, 0, {
      type: 'html',
      value: '<details>\n<summary>Docs</summary>',
    });

    let nextIndex = parent.children
      .slice(index + 1)
      .findIndex((node) => is(node, { type: 'heading', depth: 2 }));
    if (nextIndex === -1) {
      nextIndex = parent.children.length;
    } else {
      nextIndex += index + 1;
    }

    parent.children.splice(nextIndex, 0, {
      type: 'html',
      value: '</details>',
    });
  });
};

const insertChangeNotifier = (specsDiff) => (tree) => {
  visit(tree, { type: 'heading', depth: 2 }, (node, index, parent) => {
    // TODO: Determine which (if any) change notifier to insert
    // ⚠ **CHANGES** ⚠
    // parent.children.splice(index + 1, 0, {
    //   type: 'paragraph',
    //   children: [
    //     {
    //       type: 'paragraph',
    //       children: [
    //         {
    //           type: 'text',
    //           value: '🚨 ',
    //         },
    //         {
    //           type: 'strong',
    //           children: [
    //             {
    //               type: 'text',
    //               value: 'BREAKING CHANGES',
    //             },
    //           ],
    //         },
    //         {
    //           type: 'text',
    //           value: ' 🚨',
    //         },
    //       ],
    //     },
    //   ],
    // });
    // return [visit.SKIP, index + 1];
  });
};

module.exports = {
  removeUnwantedNodes,
  wrapOperationsWithDetails,
  insertChangeNotifier,
  process: (contents, specsDiff) =>
    remark()
      .use(removeUnwantedNodes)
      .use(wrapOperationsWithDetails)
      .use(insertChangeNotifier, specsDiff)
      .process(contents),
};
