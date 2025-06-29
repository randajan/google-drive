import { solids } from "@randajan/props";
import { GoogleDrive } from "../drive/Drive";
import { vault } from "../consts";
import { syncFile, syncFiles } from "./static";
import { createDB } from "./db";

export class GoogleDriveSync {
    constructor({
        auth,
        remoteRootId,
        localRootPath,
        caseSensitive=false,
        debug=(()=>{})
    }) {
        const _p = { debug };

        _p.drive = new GoogleDrive({
            auth,
            rootId:remoteRootId,
            defaultFields:["createdTime", "modifiedTime"]
        });
        
        _p.db = createDB(localRootPath);

        solids(this, {
            remoteRootId,
            localRootPath,
            caseSensitive,
        });

        vault.set(this, _p);
    }

    async pull(relPath) {
        const _p = vault.get(this);
        return syncFile(this, _p, "PULL", relPath);
    }
    async push(relPath) {
        const _p = vault.get(this);
        return syncFile(this, _p, "PUSH", relPath);
    }

    async refresh() {
        const _p = vault.get(this);
        if (_p.pending) { return _p.pending; }
        const res = _p.pending = syncFiles(this, _p);
        delete _p.pending;
        return res;
    }
}