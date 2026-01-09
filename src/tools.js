import path from "path";
import { URL } from "url";
import { _modes, _onMissingActions, _recStates } from "./consts";

export const sliceMap = (arr, size, callback) => {
    size = Math.max(1, size) || 1;
    const r = [];
    if (!Array.isArray(arr)) { return r; }
    for (let k = 0; k < arr.length; k += size) {
        r.push(callback(arr.slice(k, k + size), r.length, size, arr.length));
    }
    return r;
}

export const extendURL = (url, query={})=>{
    const u = new URL(url);
    for (let i in query) {
        if (query[i] != null) { u.searchParams.append(i, query[i]); }
    }
    return u.toString();
}


export const isValidURL = str => {
    try { new URL(str); } catch (e) { return false; }
    return true;
}

export const validateURL = (required, url, errProp)=>{
    if (!url && !required) { return; }
    if (isValidURL(url)) { return url; }
    throw new Error(`${errProp} is not a valid URL`);
}

export const validateFn = (required, fn, errProp)=>{
    if (!fn && !required) { return; }
    if (typeof fn === "function") { return fn; }
    throw new Error(`${errProp} is not a valid function`);
}

export const validateMode = (mode)=>{
    if (_modes.includes(mode)) { return mode; }
    throw new Error(`Mode '${defaultMode}' is unexpected. Should be one of: '${_modes.join("', '")}'`);
}

export const validateOnMissing = (fn, errProp)=>{
    fn = validateFn(true, fn, errProp);
    return async(...a)=>{
        const res = await fn(...a);
        if (res == null) { return _onMissingActions[0]; }
        if (_onMissingActions.includes(res)) { return res; }
        console.warn(`GoogleDriveSync onMissing(...) should return one of: '${_onMissingActions.join("', '")}'`);
        return _onMissingActions[0];
    }
}

export const normalizeRelPath = (relPath = "", fastPath = false)=>{
    if (relPath == null || relPath === "") { return ""; }

    if (
        fastPath &&
        relPath &&
        relPath.indexOf("\\") === -1 &&
        relPath.indexOf("//") === -1 &&
        !relPath.startsWith("./") &&
        !relPath.startsWith("../") &&
        !relPath.startsWith("/")
    ) {
        return relPath;
    }

    const cleaned = relPath.replace(/\\/g, "/");
    const trimmed = cleaned.replace(/^([./])+/, "");
    const normalized = path.posix.normalize(trimmed).replace(/^\/+/, "");
    return normalized === "." ? "" : normalized;
}

export const splitRelPath = (relPath = "", fastPath = false)=>{
    return normalizeRelPath(relPath, fastPath).split("/").filter(Boolean);
}


export const toBase64 = plain=>Buffer.from(plain, 'utf8').toString('base64');
export const fromBase64 = encoded=>Buffer.from(encoded, 'base64').toString('utf8');
