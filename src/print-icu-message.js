/*
 * Copyright 2015, Yahoo Inc.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

import {parse} from 'intl-messageformat-parser';

const ESCAPED_CHARS = {
    '\\' : '\\\\',
    '\\#': '\\#',
    '{'  : '\\{',
    '}'  : '\\}',
};

const ESAPE_CHARS_REGEXP = /\\#|[{}\\]/g;

export default function (message, prettyPrint = false) {
    let ast = parse(message);
    return printICUMessage(ast, prettyPrint);
}

function printICUMessage(ast, prettyPrint) {
    let printedNodes = ast.elements.map((node) => {
        if (node.type === 'messageTextElement') {
            return printMessageTextASTNode(node);
        }

        if (!node.format) {
            return `{${node.id}}`;
        }

        switch (getArgumentType(node.format)) {
        case 'number':
        case 'date':
        case 'time':
            return printSimpleFormatASTNode(node);

        case 'plural':
        case 'selectordinal':
        case 'select':
            return printOptionalFormatASTNode(node, prettyPrint);
        }
    });

    return printedNodes.join('');
}

function getArgumentType(format) {
    const {type, ordinal} = format;

    // Special-case ordinal plurals to use `selectordinal` instead of `plural`.
    if (type === 'pluralFormat' && ordinal) {
        return 'selectordinal';
    }

    return type.replace(/Format$/, '').toLowerCase();
}

function printMessageTextASTNode({value}) {
    return value.replace(ESAPE_CHARS_REGEXP, (char) => ESCAPED_CHARS[char]);
}

function printSimpleFormatASTNode({id, format}) {
    let argumentType = getArgumentType(format);
    let style = format.style ? `, ${format.style}` : '';

    return `{${id}, ${argumentType}${style}}`;
}

function printOptionalFormatASTNode({id, format}, prettyPrint) {
    let argumentType = getArgumentType(format);
    let offset = format.offset ? `, offset:${format.offset}` : '';

    let options = format.options.map((option) => {
        let optionValue = printICUMessage(option.value);
        return ` ${option.selector} {${optionValue}}`;
    });

    if (prettyPrint) return `{${id}, ${argumentType}${offset},
   ${options.join('\n   ')}
}`

    return `{${id}, ${argumentType}${offset},${options.join('')}}`;
}
