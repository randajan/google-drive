
export const _defaultFields = ["id", "name", "mimeType"];
export const _folderMime = "application/vnd.google-apps.folder";

export const isFolder = f=>f?.mimeType === _folderMime;
export const isFile = f=>f?.mimeType && !isFolder(f);

export const concatFields = (to, from) => (Array.isArray(from) && from.length) ? [...new Set(to.concat(from))] : to;

export const escapeSearch = str => str.replace(/'/g,"\\'");

export const query = (...filters) => {
    filters.push("trashed = false");
    return filters.join(" and ");
}

export const queryFolder = (...filters)=>{
    const kind = `mimeType = '${_folderMime}'`;
    return query(kind, ...filters);
}

export const queryFile = (...filters)=>{
    const kind = `mimeType != '${_folderMime}'`;
    return query(kind, ...filters);
}

export const qName = name=>`name = '${escapeSearch(name)}'`;
export const qParent = parentId=>`'${escapeSearch(parentId)}' in parents`;
