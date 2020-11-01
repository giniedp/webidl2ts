import * as https from 'https'
import * as fs from 'fs'
import { JSDOM } from 'jsdom'

const idlSelector = [
  'pre.idl:not(.extract):not(.example)', // bikeshed and ReSpec
  'pre.code code.idl-code', // Web Cryptography
  'pre:not(.extract) code.idl', // HTML
  '#permission-registry + pre.highlight', // Permissions
].join(',')

export async function fetchIDL(uri: string): Promise<string> {
  let result: string
  if (fs.existsSync(uri)) {
    result = fs.readFileSync(uri).toString()
  } else {
    result = await getUrl(uri)
  }
  if (uri.match(/\.w?idl$/)) {
    return result
  }
  return extractIDL(JSDOM.fragment(result))
}

function extractIDL(dom: DocumentFragment) {
  const elements = Array.from(dom.querySelectorAll(idlSelector)).filter((el) => {
    if (el.parentElement && el.parentElement.classList.contains('example')) {
      return false
    }
    const previous = el.previousElementSibling
    if (!previous) {
      return true
    }
    return !previous.classList.contains('atrisk') && !previous.textContent.includes('IDL Index')
  })
  return elements.map((element) => trimCommonIndentation(element.textContent).trim()).join('\n\n')
}

/**
 * Remove common indentation:
 *     <pre>
 *       typedef Type = "type";
 *
 *       dictionary Dictionary {
 *         "member"
 *       };
 *     </pre>
 * Here the textContent has 6 common preceding whitespaces that can be unindented.
 */
function trimCommonIndentation(text: string) {
  const lines = text.split('\n')
  if (!lines[0].trim()) {
    lines.shift()
  }
  if (!lines[lines.length - 1].trim()) {
    lines.pop()
  }
  const commonIndentation = Math.min(...lines.filter((line) => line.trim()).map(getIndentation))
  return lines.map((line) => line.slice(commonIndentation)).join('\n')
}

/**
 * Count preceding whitespaces
 */
function getIndentation(line: string) {
  let count = 0
  for (const ch of line) {
    if (ch !== ' ') {
      break
    }
    count++
  }
  return count
}

function getUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = ''
        resp.on('data', (chunk) => (data += chunk))
        resp.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}
