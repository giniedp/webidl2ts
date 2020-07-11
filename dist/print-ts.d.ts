import * as ts from 'typescript';
export declare function printTs(nodes: ts.Statement[]): string;
export declare function printEmscriptenModule(moduleName: string, nodes: ts.Statement[]): string;
export declare function printEmscriptenModuleAmbient(moduleName: string, nodes: ts.Statement[]): string;
