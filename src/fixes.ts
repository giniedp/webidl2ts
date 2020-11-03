export const fixes = {
  inheritance: (idlString: string): string => {
    // need fix for error:
    //
    //      WebIDLParseError: Syntax error at line 49, since `interface btVector4`:
    //      btVector4 implements btVector3;
    //      ^ Unrecognised tokens
    //
    // current solution:
    // find everything that match
    //
    //      LEFT implements RIGHT;
    //
    // and comment them out
    // then replace all occurence
    //
    //      interface LEFT {
    //
    // with
    //
    //      interface LEFT: RIGHT {
    //
    const inheritance = []
    idlString = idlString.replace(/([a-zA-Z0-9]+) implements ([a-zA-Z0-9]+);/gi, (line, left, right) => {
      inheritance.push({ left, right })
      return `// ${line}`
    })
    inheritance.forEach(({ left, right }) => {
      idlString = idlString.replace(new RegExp(`interface ${left} {`), `interface ${left}: ${right} {`)
    })
    return idlString
  },

  array: (idlString: string): string => {
    // need fix for error:
    //
    //      WebIDLParseError: Syntax error at line 102, since `interface btTransform`:
    //        void setFromOpenGLMatrix(float[] m)
    //                                 ^ Unterminated operation
    //
    // current solution: use sequence<float> type
    return idlString
      .replace(/attribute (\w+)\[\]/gi, (match, group) => {
        return `attribute FrozenArray<${group}>`
      })
      .replace(/float\[\]/gi, 'FrozenArray<float>')
      .replace(/long\[\]/gi, 'FrozenArray<long>')
  },
}
