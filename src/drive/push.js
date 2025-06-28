import { _defaultFields, _folderMime, qName, qParent, queryFile, queryFolder } from "./helpers";
import { getBy } from "./pull";

export const createFile = async (api, parentId, name, body, mimeType, fields=_defaultFields) => {
    const resp = await api.files.create({
        resource: { name, parents: [parentId], mimeType },
        media: { mimeType, body },
        fields:fields.join(", ")
    });
    return resp.data;
}

export const createFolder = async (api, parentId, name, fields=_defaultFields)=>{
    const resp = await api.files.create({
        resource: { name, parents: [parentId], mimeType:_folderMime },
        fields:fields.join(", ")
    });
    return resp.data;
}

export const updateFileById = async (api, fileId, body, mimeType, fields=_defaultFields)=>{
    const resp = await api.files.update({
        fileId,
        resource:{ mimeType },
        media: { mimeType, body },
        fields:fields.join(", ") }
    );
    return resp.data;
}

export const pushFileByPath = async (drive, relPath, body, mimeType = "text/plain", fields=_defaultFields, create = false, update = false) => {
    const { api, rootId } = drive;
    const segs = relPath.split("/").filter(Boolean);
    const last = segs.length - 1;
    let parentId = rootId;
    let file = null;

    for (let i = 0; i < segs.length; i++) {
        const name = segs[i];
        const isLast = i === last;
        const q = isLast ? queryFile : queryFolder;

        file = await getBy(api, q(qParent(parentId), qName(name)), ["id"]);
        if (!isLast) {
            if (file) {}
            else if (create) { file = await createFolder(api, parentId, name, ["id"]); }
            else { throw new Error(drive.msg(`path doesn't exists`, name)); }
            parentId = file.id;
        } else if (file) {
            if (!update) { throw new Error(drive.msg(`allready exists`, name)); }
            return updateFileById(api, file.id, body, mimeType, fields);
        } else {
            if (!create) { throw new Error(drive.msg(`doesn't exists`, name)); }
            return createFile(api, parentId, name, body, mimeType, fields);
        } 
    }
}