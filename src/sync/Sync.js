import { solids } from "@randajan/props";
import { GoogleDrive } from "../drive/Drive";
import { _modes, vault } from "../consts";
import { syncFile, syncFiles } from "./static";
import { createDB } from "./db";
import { validateFn, validateMode, validateOnMissing } from "../tools";

export class GoogleDriveSync {
    constructor({
        auth,
        mode="MERGE",
        remoteRootId,
        localRootPath,
        onMissing=(rec=>rec.missingCount > 3 ? "remove" : "wait"),
        caseSensitive=false,
        debug=(()=>{})
    }) {
        const _p = {};

        _p.mode = validateMode(mode);
        _p.onMissing = validateOnMissing(onMissing, "onMissing");
        _p.debug = validateFn(true, debug, "debug");

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

    async remove(relPath) {
        const _p = vault.get(this);
        return syncFile(this, _p, "DEL", relPath);
    }


    async sync() {
        const _p = vault.get(this);
        if (_p.pending) { return _p.pending; }
        const res = _p.pending = syncFiles(this, _p);
        delete _p.pending;
        return res;
    }

}