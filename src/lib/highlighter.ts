export function highlightCode(code: string, extension: string): string {
  if (!code) return "&nbsp;";

  const ext = extension.toLowerCase();

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  let htmlResult = "";

  if (ext === "py") {
    const pyKeywords = new Set([
      "import", "from", "as", "if", "elif", "else", "for", "while", "return", "try", 
      "except", "finally", "lambda", "None", "True", "False", "in", "and", "or", "not", 
      "is", "with", "pass", "break", "continue", "yield", "async", "await", "global", 
      "nonlocal", "assert", "del"
    ]);

    const pyBuiltins = new Set([
      "print", "len", "range", "append", "input", "int", "str", "dict", "list", "set", 
      "open", "sum", "min", "max", "type", "isinstance", "enumerate", "zip", "abs", 
      "round", "all", "any", "map", "filter"
    ]);

    // Sticky regex definitions
    const rTripleDouble = /"""[\s\S]*?"""/y;
    const rTripleSingle = /'''[\s\S]*?'''/y;
    const rDoubleQuote = /"[^"\\]*(?:\\.[^"\\]*)*"/y;
    const rSingleQuote = /'[^'\\]*(?:\\.[^\'\\]*)*'/y;
    const rComment = /#[^\n]*/y;
    const rDecorator = /@[\w_.]+/y;
    const rClassDef = /\b(class)(\s+)(\w+)\b/y;
    const rFuncDef = /\b(def)(\s+)(\w+)\b/y;
    const rSelf = /\bself\b/y;
    const rNumber = /\b\d+\b/y;
    const rIdentifier = /[a-zA-Z_]\w*/y;
    const rOperator = /=>|==|!=|\+=|-=|\*=|\/=|[\+\-\*/%=\!&<>:|{}()\[\];.,]/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    while (index < code.length) {
      // 1. Whitespace
      rWhitespace.lastIndex = index;
      let m = rWhitespace.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      // 2. Triple double quotes
      rTripleDouble.lastIndex = index;
      m = rTripleDouble.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 3. Triple single quotes
      rTripleSingle.lastIndex = index;
      m = rTripleSingle.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 4. Double quotes
      rDoubleQuote.lastIndex = index;
      m = rDoubleQuote.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 5. Single quotes
      rSingleQuote.lastIndex = index;
      m = rSingleQuote.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 6. Comments
      rComment.lastIndex = index;
      m = rComment.exec(code);
      if (m) {
        htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 7. Decorator
      rDecorator.lastIndex = index;
      m = rDecorator.exec(code);
      if (m) {
        htmlResult += `<span class="text-yellow-400">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 8. Class definition
      rClassDef.lastIndex = index;
      m = rClassDef.exec(code);
      if (m) {
        htmlResult += `<span class="text-blue-400 font-bold">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}<span class="text-emerald-400 font-bold underline decoration-emerald-500/40">${escapeHtml(m[3])}</span>`;
        index += m[0].length;
        continue;
      }

      // 9. Function definition
      rFuncDef.lastIndex = index;
      m = rFuncDef.exec(code);
      if (m) {
        htmlResult += `<span class="text-blue-400 font-bold">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}<span class="text-sky-300 font-bold">${escapeHtml(m[3])}</span>`;
        index += m[0].length;
        continue;
      }

      // 10. Self
      rSelf.lastIndex = index;
      m = rSelf.exec(code);
      if (m) {
        htmlResult += `<span class="text-orange-400 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 11. Numbers
      rNumber.lastIndex = index;
      m = rNumber.exec(code);
      if (m) {
        htmlResult += `<span class="text-teal-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 12. Identifiers (Keywords and Builtins)
      rIdentifier.lastIndex = index;
      m = rIdentifier.exec(code);
      if (m) {
        const id = m[0];
        if (pyKeywords.has(id)) {
          htmlResult += `<span class="text-pink-400 font-bold">${escapeHtml(id)}</span>`;
        } else if (pyBuiltins.has(id)) {
          htmlResult += `<span class="text-sky-400 font-medium">${escapeHtml(id)}</span>`;
        } else {
          htmlResult += escapeHtml(id);
        }
        index += id.length;
        continue;
      }

      // 13. Operators
      rOperator.lastIndex = index;
      m = rOperator.exec(code);
      if (m) {
        htmlResult += `<span class="text-rose-400">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 14. Any other character
      rAny.lastIndex = index;
      m = rAny.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
      }
    }
  } 
  else if (["js", "ts", "jsx", "tsx"].includes(ext)) {
    const jsKeywords = new Set([
      "const", "let", "var", "return", "if", "else", "for", "while", "do", "switch", 
      "case", "break", "continue", "import", "from", "export", "default", "async", 
      "await", "try", "catch", "finally", "throw", "new", "extends", "interface", 
      "type", "enum", "private", "public", "readonly", "implements", "as", "any", 
      "string", "number", "boolean", "void", "null", "undefined", "true", "false", "class", "function"
    ]);

    // Sticky regex definitions
    const rMultiComment = /\/\*[\s\S]*?\*\//y;
    const rSingleComment = /\/\/[^\n]*/y;
    const rTemplateLiteral = /`[\s\S]*?`/y;
    const rDoubleQuote = /"[^"\\]*(?:\\.[^"\\]*)*"/y;
    const rSingleQuote = /'[^'\\]*(?:\\.[^\'\\]*)*'/y;
    const rClassDef = /\b(class)(\s+)(\w+)\b/y;
    const rFuncDef = /\b(function)(\s+)(\w+)\b/y;
    const rMethodCall = /\b(\w+)(?=\()/y;
    const rNumber = /\b\d+\b/y;
    const rIdentifier = /[a-zA-Z_$][a-zA-Z0-9_$]*/y;
    const rOperator = /=>|===|==|!==|!=|\+=|-=|\*=|\/=|[\+\-\*/%=\!&<>:|{}()\[\];.,]/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    while (index < code.length) {
      // 1. Whitespace
      rWhitespace.lastIndex = index;
      let m = rWhitespace.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      // 2. Comments
      rMultiComment.lastIndex = index;
      m = rMultiComment.exec(code);
      if (m) {
        htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rSingleComment.lastIndex = index;
      m = rSingleComment.exec(code);
      if (m) {
        htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 3. Strings
      rTemplateLiteral.lastIndex = index;
      m = rTemplateLiteral.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rDoubleQuote.lastIndex = index;
      m = rDoubleQuote.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rSingleQuote.lastIndex = index;
      m = rSingleQuote.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 4. Class def
      rClassDef.lastIndex = index;
      m = rClassDef.exec(code);
      if (m) {
        htmlResult += `<span class="text-pink-400 font-bold">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}<span class="text-emerald-400 font-bold">${escapeHtml(m[3])}</span>`;
        index += m[0].length;
        continue;
      }

      // 5. Function def
      rFuncDef.lastIndex = index;
      m = rFuncDef.exec(code);
      if (m) {
        htmlResult += `<span class="text-pink-400 font-bold">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}<span class="text-sky-300 font-bold">${escapeHtml(m[3])}</span>`;
        index += m[0].length;
        continue;
      }

      // 6. Method call
      rMethodCall.lastIndex = index;
      m = rMethodCall.exec(code);
      if (m) {
        htmlResult += `<span class="text-sky-300 font-medium">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 7. Numbers
      rNumber.lastIndex = index;
      m = rNumber.exec(code);
      if (m) {
        htmlResult += `<span class="text-teal-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 8. Identifiers
      rIdentifier.lastIndex = index;
      m = rIdentifier.exec(code);
      if (m) {
        const id = m[0];
        if (jsKeywords.has(id)) {
          htmlResult += `<span class="text-pink-400 font-bold">${escapeHtml(id)}</span>`;
        } else {
          htmlResult += escapeHtml(id);
        }
        index += id.length;
        continue;
      }

      // 9. Operators
      rOperator.lastIndex = index;
      m = rOperator.exec(code);
      if (m) {
        htmlResult += `<span class="text-rose-400">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 10. Any other character
      rAny.lastIndex = index;
      m = rAny.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
      }
    }
  } 
  else if (ext === "html") {
    const rComment = /<!--[\s\S]*?-->/y;
    const rDoctype = /<!DOCTYPE\s+[^>]*>/iy;
    const rTagOpen = /<\/?[a-zA-Z0-9:-]+/y;
    const rTagClose = /\/?>/y;
    const rAttr = /([a-zA-Z0-9_-]+)(\s*=\s*)("[^"]*"|'[^']*')/y;
    const rAttrNoVal = /[a-zA-Z0-9_-]+/y;
    const rText = /[^<]+/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    let insideTag = false;

    while (index < code.length) {
      if (!insideTag) {
        // 1. Comments
        rComment.lastIndex = index;
        let m = rComment.exec(code);
        if (m) {
          htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
          index += m[0].length;
          continue;
        }

        // 2. Doctype
        rDoctype.lastIndex = index;
        m = rDoctype.exec(code);
        if (m) {
          htmlResult += `<span class="text-slate-500 font-bold">${escapeHtml(m[0])}</span>`;
          index += m[0].length;
          continue;
        }

        // 3. Tag open
        rTagOpen.lastIndex = index;
        m = rTagOpen.exec(code);
        if (m) {
          htmlResult += `<span class="text-orange-400 font-medium">${escapeHtml(m[0])}</span>`;
          insideTag = true;
          index += m[0].length;
          continue;
        }

        // 4. Text
        rText.lastIndex = index;
        m = rText.exec(code);
        if (m) {
          htmlResult += escapeHtml(m[0]);
          index += m[0].length;
          continue;
        }

        // 5. Any fallback
        rAny.lastIndex = index;
        m = rAny.exec(code);
        if (m) {
          htmlResult += escapeHtml(m[0]);
          index += m[0].length;
        }
      } else {
        // 1. Whitespace
        rWhitespace.lastIndex = index;
        let m = rWhitespace.exec(code);
        if (m) {
          htmlResult += escapeHtml(m[0]);
          index += m[0].length;
          continue;
        }

        // 2. Tag close
        rTagClose.lastIndex = index;
        m = rTagClose.exec(code);
        if (m) {
          htmlResult += `<span class="text-orange-400 font-medium">${escapeHtml(m[0])}</span>`;
          insideTag = false;
          index += m[0].length;
          continue;
        }

        // 3. Attribute with value
        rAttr.lastIndex = index;
        m = rAttr.exec(code);
        if (m) {
          htmlResult += `<span class="text-blue-300">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}<span class="text-amber-300">${escapeHtml(m[3])}</span>`;
          index += m[0].length;
          continue;
        }

        // 4. Attribute no value
        rAttrNoVal.lastIndex = index;
        m = rAttrNoVal.exec(code);
        if (m) {
          htmlResult += `<span class="text-blue-300">${escapeHtml(m[0])}</span>`;
          index += m[0].length;
          continue;
        }

        // 5. Any other character inside tag
        rAny.lastIndex = index;
        m = rAny.exec(code);
        if (m) {
          htmlResult += escapeHtml(m[0]);
          index += m[0].length;
        }
      }
    }
  } 
  else if (ext === "css") {
    const rComment = /\/\*[\s\S]*?\*\//y;
    const rSelector = /[.#a-zA-Z0-9_-]+(?=\s*\{)/y;
    const rProperty = /[a-zA-Z0-9_-]+(?=\s*:)/y;
    const rPunctuation = /[{}:;]/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    let expectingValue = false;

    while (index < code.length) {
      // 1. Whitespace
      rWhitespace.lastIndex = index;
      let m = rWhitespace.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      // 2. Comment
      rComment.lastIndex = index;
      m = rComment.exec(code);
      if (m) {
        htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 3. Expected Value (stateful highlight)
      if (expectingValue) {
        const rValueMatch = /[^;{}]+/y;
        rValueMatch.lastIndex = index;
        m = rValueMatch.exec(code);
        if (m) {
          htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
          expectingValue = false;
          index += m[0].length;
          continue;
        }
      }

      // 4. Selector
      rSelector.lastIndex = index;
      m = rSelector.exec(code);
      if (m) {
        htmlResult += `<span class="text-purple-400 font-bold">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 5. Property
      rProperty.lastIndex = index;
      m = rProperty.exec(code);
      if (m) {
        htmlResult += `<span class="text-blue-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      // 6. Punctuation
      rPunctuation.lastIndex = index;
      m = rPunctuation.exec(code);
      if (m) {
        const char = m[0];
        if (char === ":") {
          expectingValue = true;
        } else if (char === ";" || char === "}" || char === "{") {
          expectingValue = false;
        }
        htmlResult += escapeHtml(char);
        index += 1;
        continue;
      }

      // 7. Any other character
      rAny.lastIndex = index;
      m = rAny.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
      }
    }
  } 
  else if (ext === "dart") {
    const dartKeywords = new Set([
      "void", "class", "final", "required", "this", "extends", "super", "const", "var", 
      "if", "else", "for", "while", "return", "import", "as", "new", "get", "set", 
      "static", "dynamic", "int", "double", "bool", "String", "List", "Map", "Set", 
      "late", "override"
    ]);

    const rMultiComment = /\/\*[\s\S]*?\*\//y;
    const rSingleComment = /\/\/[^\n]*/y;
    const rDoubleQuote = /"[^"\\]*(?:\\.[^"\\]*)*"/y;
    const rSingleQuote = /'[^'\\]*(?:\\.[^\'\\]*)*'/y;
    const rMethodCall = /\b(\w+)(?=\()/y;
    const rNumber = /\b\d+\b/y;
    const rIdentifier = /[a-zA-Z_]\w*/y;
    const rOperator = /=>|==|!=|\+=|-=|\*=|\/=|[\+\-\*/%=\!&<>:|{}()\[\];.,]/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    while (index < code.length) {
      rWhitespace.lastIndex = index;
      let m = rWhitespace.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      rMultiComment.lastIndex = index;
      m = rMultiComment.exec(code);
      if (m) {
        htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rSingleComment.lastIndex = index;
      m = rSingleComment.exec(code);
      if (m) {
        htmlResult += `<span class="text-slate-500 italic">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rDoubleQuote.lastIndex = index;
      m = rDoubleQuote.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rSingleQuote.lastIndex = index;
      m = rSingleQuote.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rMethodCall.lastIndex = index;
      m = rMethodCall.exec(code);
      if (m) {
        htmlResult += `<span class="text-sky-300 font-medium">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rNumber.lastIndex = index;
      m = rNumber.exec(code);
      if (m) {
        htmlResult += `<span class="text-teal-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rIdentifier.lastIndex = index;
      m = rIdentifier.exec(code);
      if (m) {
        const id = m[0];
        if (dartKeywords.has(id)) {
          htmlResult += `<span class="text-pink-400 font-bold">${escapeHtml(id)}</span>`;
        } else {
          htmlResult += escapeHtml(id);
        }
        index += id.length;
        continue;
      }

      rOperator.lastIndex = index;
      m = rOperator.exec(code);
      if (m) {
        htmlResult += `<span class="text-rose-400">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rAny.lastIndex = index;
      m = rAny.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
      }
    }
  } 
  else if (ext === "json") {
    const rKey = /"[^"\\]*(?:\\.[^"\\]*)*"(?=\s*:)/y;
    const rStringVal = /"[^"\\]*(?:\\.[^"\\]*)*"/y;
    const rNumber = /\b\d+\b/y;
    const rBooleanNull = /\b(true|false|null)\b/y;
    const rPunctuation = /[:{},\[\]]/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    while (index < code.length) {
      rWhitespace.lastIndex = index;
      let m = rWhitespace.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      rKey.lastIndex = index;
      m = rKey.exec(code);
      if (m) {
        htmlResult += `<span class="text-sky-300 font-bold">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rStringVal.lastIndex = index;
      m = rStringVal.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rNumber.lastIndex = index;
      m = rNumber.exec(code);
      if (m) {
        htmlResult += `<span class="text-teal-300">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rBooleanNull.lastIndex = index;
      m = rBooleanNull.exec(code);
      if (m) {
        htmlResult += `<span class="text-pink-400 font-bold">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rPunctuation.lastIndex = index;
      m = rPunctuation.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      rAny.lastIndex = index;
      m = rAny.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
      }
    }
  } 
  else if (ext === "md") {
    // Standard markdown styling
    const rHeading = /^#[^\n]*/my;
    const rLink = /\[[^\]\n]*\]\([^)\n]*\)/y;
    const rBold = /\*\*[^\n*]+\*\*/y;
    const rCodeInline = /`[^`\n]+`/y;
    const rWhitespace = /\s+/y;
    const rAny = /./y;

    let index = 0;
    while (index < code.length) {
      rWhitespace.lastIndex = index;
      let m = rWhitespace.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
        continue;
      }

      rHeading.lastIndex = index;
      m = rHeading.exec(code);
      if (m) {
        htmlResult += `<span class="text-emerald-400 font-bold">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rLink.lastIndex = index;
      m = rLink.exec(code);
      if (m) {
        htmlResult += `<span class="text-blue-400 underline">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rBold.lastIndex = index;
      m = rBold.exec(code);
      if (m) {
        htmlResult += `<span class="font-bold text-slate-100">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rCodeInline.lastIndex = index;
      m = rCodeInline.exec(code);
      if (m) {
        htmlResult += `<span class="text-amber-300 font-mono">${escapeHtml(m[0])}</span>`;
        index += m[0].length;
        continue;
      }

      rAny.lastIndex = index;
      m = rAny.exec(code);
      if (m) {
        htmlResult += escapeHtml(m[0]);
        index += m[0].length;
      }
    }
  } 
  else {
    // Plain text fallback
    htmlResult = escapeHtml(code);
  }

  // Trailing empty line fix
  if (code.endsWith("\n")) {
    htmlResult += "\n ";
  }

  return htmlResult;
}
