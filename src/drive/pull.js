import { _defaultFields, _folderMime, concatFields, qName, qParent, query, queryFile, queryFolder } from "./helpers";

export const getBy = async (api, query, fields = _defaultFields) => {
    const resp = await api.files.list({
        q: query,
        fields: `files(${fields.join(", ")})`,
        pageSize: 1
    });
    return resp?.data?.files?.[0];
}

export const getById = async (api, fileId, fields = _defaultFields) => {
    const resp = await api.files.get({
        fileId,
        fields: concatFields(fields, ["trashed"]).join(", "),
        supportsAllDrives: true        // pokud používáš Shared Drives
    });

    const file = resp.data;

    if (file.trashed) { return; }
    if (!fields.includes("trashed")) { delete file.trashed; }

    return file;
}

export const getByPath = async (drive, isFile, relPath, fields = _defaultFields) => {
    const { api, rootId } = drive;
    const segs = relPath.split("/").filter(Boolean);
    const last = segs.length - 1;
    let parentId = rootId;
    let file = null;

    for (let i = 0; i < segs.length; i++) {
        const name = segs[i];
        const isLast = i == last;

        const flds = isLast ? fields : _defaultFields;
        const kind = (isLast && isFile) ? "file" : "folder";
        const q = kind === "file" ? queryFile : queryFolder;

        file = await getBy(api, q(qParent(parentId), qName(name)), flds);
        if (!file) { throw new Error(drive.msg(`${kind} '${name}' not found in path`, relPath)); }
        parentId = file.id;
    }

    return file;
}

export const readFile = async (api, fileId, stream = true) => {
    const responseType = stream ? "stream" : undefined;
    const resp = await api.files.get({ fileId, alt: 'media' }, { responseType });
    return resp?.data;
}


export const mapFiles = async (api, parentId, callback, fields = _defaultFields) => {
    const result = [];
    let pending = Promise.resolve();
    let pageToken;

    const mapPart = async (files) => {
        for (const file of files) {
            const r = await callback(file);
            if (r !== undefined) { result.push(r); }
        }
        return result;
    }

    do {
        const [resp] = await Promise.all([api.files.list({
            q: query(qParent(parentId)),
            fields: `nextPageToken, files(${fields.join(", ")})`,
            pageSize: 1000,
            pageToken
        }), pending]);

        const { nextPageToken, files } = resp.data;
        pending = mapPart(files);
        pageToken = nextPageToken;
    } while (pageToken);

    return await pending;
}