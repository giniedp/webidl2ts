import * as webidl2 from 'webidl2'

export async function parseIDL(idlString: string, options?: { preprocess: (input: string) => string }): Promise<webidl2.IDLRootType[]> {
  if (options?.preprocess) {
    idlString = options.preprocess(idlString)
  }
  return webidl2.parse(idlString)
}
