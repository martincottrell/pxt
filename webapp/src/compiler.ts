import * as workspace from "./workspace";
import * as data from "./data";
import * as pkg from "./package";
import * as core from "./core";
import * as srceditor from "./srceditor"
import * as workeriface from "./workeriface"


import Cloud = pxt.Cloud;
import U = pxt.Util;

let iface: workeriface.Iface

export function init() {
    if (!iface) {
        iface = workeriface.makeWebWorker(pxt.webConfig.workerjs)
    }
}

function setDiagnostics(diagnostics: ts.pxt.KsDiagnostic[]) {
    let mainPkg = pkg.mainEditorPkg();

    mainPkg.forEachFile(f => f.diagnostics = [])

    let output = "";

    for (let diagnostic of diagnostics) {
        if (diagnostic.fileName) {
            output += `${diagnostic.category == ts.DiagnosticCategory.Error ? lf("error") : diagnostic.category == ts.DiagnosticCategory.Warning ? lf("warning") : lf("message")}: ${diagnostic.fileName}(${diagnostic.line + 1},${diagnostic.character + 1}): `;
            let f = mainPkg.filterFiles(f => f.getTypeScriptName() == diagnostic.fileName)[0]
            if (f)
                f.diagnostics.push(diagnostic)
        }

        const category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();
        output += `${category} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}\n`;
    }

    if (!output)
        output = U.lf("Everything seems fine!\n")


    let f = mainPkg.outputPkg.setFile("output.txt", output)
    // display total number of errors on the output file
    f.numDiagnosticsOverride = diagnostics.filter(d => d.category == ts.DiagnosticCategory.Error).length
}

let hang = new Promise<any>(() => { })

function catchUserErrorAndSetDiags(r: any) {
    return (v: any) => {
        if (v.isUserError) {
            core.errorNotification(v.message)
            let mainPkg = pkg.mainEditorPkg();
            let f = mainPkg.outputPkg.setFile("output.txt", v.message)
            f.numDiagnosticsOverride = 1
            return r
        } else return Promise.reject(v)
    }
}

export interface CompileOptions {
    native?: boolean;
    debug?: boolean;
    background?: boolean; // not explicitely requested by user (hint for simulator)
}

export function compileAsync(options: CompileOptions = {}) {
    let trg = pkg.mainPkg.getTargetOptions()
    trg.isNative = options.native
    return pkg.mainPkg.getCompileOptionsAsync(trg)
        .then(opts => {
            if (options.debug) {
                opts.breakpoints = true
                opts.justMyCode = true
            }
            return opts
        })
        .then(compileCoreAsync)
        .then(resp => {
            // TODO remove this
            pkg.mainEditorPkg().outputPkg.setFiles(resp.outfiles)
            setDiagnostics(resp.diagnostics)
            return resp
        })
        .catch(catchUserErrorAndSetDiags(hang))
}

function assembleCore(src: string): Promise<{ words: number[] }> {
    return workerOpAsync("assemble", { fileContent: src })
}

export function assembleAsync(src: string) {
    let stackBase = 0x20004000
    return assembleCore(`.startaddr ${stackBase - 256}\n${src}`)
        .then(r => {
            return assembleCore(`.startaddr ${stackBase - (r.words.length + 1) * 4}\n${src}`)
                .then(rr => {
                    U.assert(rr.words.length == r.words.length)
                    return rr
                })
        })
}

function compileCoreAsync(opts: ts.pxt.CompileOptions): Promise<ts.pxt.CompileResult> {
    return workerOpAsync("compile", { options: opts })
}

export function decompileAsync(fileName: string) {
    let trg = pkg.mainPkg.getTargetOptions()
    return pkg.mainPkg.getCompileOptionsAsync(trg)
        .then(opts => {
            opts.ast = true;
            return decompileCoreAsync(opts, fileName)
        })
        .then(resp => {
            // TODO remove this
            pkg.mainEditorPkg().outputPkg.setFiles(resp.outfiles)
            setDiagnostics(resp.diagnostics)
            return resp
        })
}

function decompileCoreAsync(opts: ts.pxt.CompileOptions, fileName: string): Promise<ts.pxt.CompileResult> {
    return workerOpAsync("decompile", { options: opts, fileName: fileName })
}

export function workerOpAsync(op: string, arg: ts.pxt.service.OpArg) {
    init()
    return iface.opAsync(op, arg)
}

let firstTypecheck: Promise<void>;
let cachedApis: ts.pxt.ApisInfo;
let refreshApis = false;

function waitForFirstTypecheckAsync() {
    if (firstTypecheck) return firstTypecheck;
    else return typecheckAsync();
}

function localizeApis(apis: ts.pxt.ApisInfo) {

    const lang = ts.pxt.Util.userLanguage();
    if (ts.pxt.Util.userLanguage() != "en") {
        let loc = pkg.mainPkg.localizationStrings(lang);
        Util.values(apis.byQName).forEach(fn => {
            const jsDoc = loc[fn.qName]
            if (jsDoc) {
                fn.attributes.jsDoc = jsDoc;
                fn.attributes.block = loc[`${fn.qName}|block`] || fn.attributes.block;
                if (fn.parameters)
                    fn.parameters.forEach(pi => pi.description = loc[`${fn.qName}|param|${pi.name}`] || pi.description);
            }
        });
    }
}

export function typecheckAsync() {
    let p = pkg.mainPkg.getCompileOptionsAsync()
        .then(opts => workerOpAsync("setOptions", { options: opts }))
        .then(() => workerOpAsync("allDiags", {}))
        .then(setDiagnostics)
        .then(() => {
            if (refreshApis || !cachedApis)
                return workerOpAsync("apiInfo", {})
                    .then(apis => {
                        refreshApis = false;
                        localizeApis(apis);
                        cachedApis = apis;
                    })
            else return Promise.resolve()
        })
        .catch(catchUserErrorAndSetDiags(null))
    if (!firstTypecheck) firstTypecheck = p;
    return p;
}

export function getApisInfoAsync() {
    return waitForFirstTypecheckAsync()
        .then(() => cachedApis)
}

export function getBlocksAsync(): Promise<ts.pxt.BlocksInfo> {
    return getApisInfoAsync()
        .then(info => ts.pxt.getBlocksInfo(info));
}

export function newProject() {
    firstTypecheck = null;
    cachedApis = null;
    workerOpAsync("reset", {}).done();
}
