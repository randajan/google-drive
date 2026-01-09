import { promises as fsp } from "fs";
import path from "path";
import { localStat, pathNormalize, pullFile, pushFile, remoteStat, mapLocal, mapRemote } from "./tools";

const _recModes = ["DEL", "PUSH", "PULL"];

const detectMisssing = async (onMissing, rec, nfo)=>{
    const { local, remote } = nfo;

    const missingSide = !local ? "local" : !remote ? "remote" : null;

    if (missingSide) {
        rec.missingCount = (rec.missingSide === missingSide ? (rec.missingCount || 0) : 0) + 1;
        rec.missingSide = missingSide;
        return onMissing(rec, nfo);
    }
    
    delete rec.missingCount;
    delete rec.missingSide;
}

const _sync2 = async ({ drive, debug, mode, onMissing }, localRootPath, relPath, rec, local, remote) => {

    const isNew = !rec;
    if (isNew) { rec = {}; }

    //doesn't exist at all = cleanup
    if (!remote && !local) {
        debug("Sweep", relPath);
        return;
    }

    //timestamps are correct = nothing/exit
    if (remote && local && rec.tsRemote == remote.ts && rec.tsLocal == local.ts) {
        debug("Ok", relPath);
        return { ...rec, state: "OK" };
    }

    const absPath = path.join(localRootPath, relPath);

    //do we respect PULL and PUSH state stored at db?
    const isRecFresh = (rec.ts > Math.max(remote?.ts || 0, local?.ts || 0));

    const force = (isRecFresh && _recModes.includes(rec.state)) ? rec.state : mode;
    const auto = (!local || (remote && local.ts < remote.ts)) ? "PULL" : (!remote || (local && remote.ts < local.ts)) ? "PUSH" : "OK";
    const missAct = (isNew || mode !== "MERGE") ? null : await detectMisssing(onMissing, rec, { mode, relPath, local, remote });

    if (missAct === "remove" || force === "DEL" || (force === "PUSH" && !local) || (force === "PULL" && !remote)) {
        debug(`${!remote ? "Pull" : "Push"} remove`, relPath);
        if (local) { await fsp.unlink(absPath); }
        if (remote) { await drive.deleteById(remote.id); }
        return;
    } else if (missAct === "wait") {
        debug(`Missing ${rec.missingSide}`, relPath);
        rec.state = "MISSING";
    } else if (force === "PULL" || (force === "MERGE" && auto === "PULL")) {
        debug(`Pull ${isNew ? "new" : !local ? "revive" : (auto === "PULL" ? "update" : "overwrite")}`, relPath);
        local = await pullFile(drive, absPath, remote.id);
        rec.state = "OK";
    } else if (force === "PUSH" || (force === "MERGE" && auto === "PUSH")) {
        debug(`Push ${isNew ? "new" : !remote ? "revive" : (auto === "PUSH" ? "update" : "overwrite")}`, relPath);
        remote = await pushFile(drive, localRootPath, relPath);
        rec.state = "OK";
    }

    if (remote) { rec.tsRemote = remote.ts; }
    if (local) { rec.tsLocal = local.ts; }

    return rec;
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
