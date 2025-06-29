import { promises as fsp } from "fs";
import path from "path";
import { localStat, pathNormalize, pullFile, pushFile, remoteStat, mapLocal, mapRemote } from "./tools";

const _sync2 = async ({ drive, debug }, localRootPath, relPath, rec, local, remote) => {
    if (!rec) { rec = {}; }

    //doesn't exist at all = cleanup
    if (!remote && !local) {
        debug("CleanUp", relPath);
        return;
    }

    //timestamps are correct = nothing/exit
    if (rec.tsRemote == remote?.ts && rec.tsLocal == local?.ts) {
        debug("OK", relPath);
        return { ...rec, state: "OK" };
    }

    const absPath = path.join(localRootPath, relPath);

    //do we respect PULL and PUSH state stored at db?
    const isRecFresh = rec.ts > Math.max(remote?.ts || 0, local?.ts || 0);

    if (isRecFresh && rec.state === "PULL") {
        if (!remote) { debug("Remote remove", relPath); await fsp.unlink(absPath); return; }
        debug("Remote update", relPath);
        local = await pullFile(drive, absPath, remote.id);
    }
    else if (isRecFresh && rec.state === "PUSH") {
        if (!local) { debug("Local remove", relPath); await drive.deleteById(remote.id); return; }
        debug("Local update", relPath);
        remote = await pushFile(drive, localRootPath, relPath);
    }
    //rec is not exist or state=OK or we do not respect db state then it will win the newest
    else if (remote && (!local || local.ts < remote.ts)) {
        debug("Local correction", relPath);
        local = await pullFile(drive, absPath, remote.id);
    }
    else if (local && (!remote || remote.ts < local.ts)) {
        debug("Remote correction", relPath);
        remote = await pushFile(drive, localRootPath, relPath);
    }

    return { state: "OK", tsRemote: remote?.ts, tsLocal: local?.ts };
}

export const syncFile = async (sync, _sync, state, relPath) => {
    const { localRootPath } = sync;
    const { db, drive, debug } = _sync;
    

    try { await drive.ping(); }
    catch(err) { debug(err.message); return; }

    relPath = pathNormalize(relPath);
    const absPath = path.join(localRootPath, relPath);

    const rec = { ...await db.get(relPath), state };
    await db.set(relPath, rec);

    const [remote, local] = await Promise.all([
        remoteStat(drive, relPath),
        localStat(absPath)
    ]);

    await db.set(relPath, await _sync2(_sync, localRootPath, relPath, rec, local, remote));
}



export const syncFiles = async (sync, _sync) => {
    const { localRootPath } = sync;
    const { db, drive, debug } = _sync;

    try { await drive.ping(); }
    catch(err) { debug(err.message); return; }

    const [remotes, locals, recs] = await Promise.all([
        mapRemote(drive, debug, sync.caseSensitive),
        mapLocal(localRootPath),
        db.getAll()
    ]);

    const relPaths = new Set([...remotes.keys(), ...locals.keys(), ...recs.keys()]);

    for (const relPath of relPaths) {
        const rec = recs.get(relPath);
        const local = locals.get(relPath);
        const remote = remotes.get(relPath);
        await db.set(relPath, await _sync2(_sync, localRootPath, relPath, rec, local, remote));
    }

    await db.optimize();
}
