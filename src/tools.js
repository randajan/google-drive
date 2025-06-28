import { URL } from "url";

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


export const toBase64 = plain=>Buffer.from(plain, 'utf8').toString('base64');
export const fromBase64 = encoded=>Buffer.from(encoded, 'base64').toString('utf8');