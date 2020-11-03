import * as webidl2 from 'webidl2';
export declare function parseIDL(idlString: string, options?: {
    preprocess: (input: string) => string;
}): Promise<webidl2.IDLRootType[]>;
