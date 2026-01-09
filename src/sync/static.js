import { promises as fsp } from "fs";
import path from "path";
import { localStat, pullFile, pushFile, remoteStat, mapLocal, mapRemote } from "./tools";
import { normalizeRelPath } from "../tools";

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

const _sync2 = async ({ drive, mode, onMissing }, localRootPath, relPath, rec, local, remote, log) => {

    const isNew = !rec;
    if (isNew) { rec = {}; }
    else { relPath = normalizeRelPath(relPath, true); }

    //doesn't exist at all = cleanup
    if (!remote && !local) {
        log("Sweep", relPath);
        return;
    }

    //timestamps are correct = nothing/exit
    if (remote && local && rec.tsRemote == remote.ts && rec.tsLocal == local.ts) {
        log("Ok", relPath);
        return { ...rec, state: "OK" };
    }

    const absPath = path.join(localRootPath, relPath);

    //do we respect PULL and PUSH state stored at db?
    const isRecFresh = (rec.ts > Math.max(remote?.ts || 0, local?.ts || 0));

    const force = (isRecFresh && _recModes.includes(rec.state)) ? rec.state : mode;
    const auto = (!local || (remote && local.ts < remote.ts)) ? "PULL" : (!remote || (local && remote.ts < local.ts)) ? "PUSH" : "OK";
    const missAct = (isNew || force !== "MERGE") ? null : await detectMisssing(onMissing, rec, { mode, relPath, local, remote });

    if (missAct === "remove" || force === "DEL" || (force === "PUSH" && !local) || (force === "PULL" && !remote)) {
        log(`${!remote ? "Pull" : "Push"} remove`, relPath);
        if (local) { await fsp.unlink(absPath); }
        if (remote) { await drive.deleteById(remote.id); }
        return;
    } else if (missAct === "wait") {
        log(`Missing ${rec.missingSide}`, relPath);
        rec.state = "MISSING";
    } else if (force === "PULL" || (force === "MERGE" && auto === "PULL")) {
        log(`Pull ${isNew ? "new" : !local ? "revive" : (auto === "PULL" ? "update" : "overwrite")}`, relPath);
        local = await pullFile(drive, absPath, remote.id);
        rec.state = "OK";
    } else if (force === "PUSH" || (force === "MERGE" && auto === "PUSH")) {
        log(`Push ${isNew ? "new" : !remote ? "revive" : (auto === "PUSH" ? "update" : "overwrite")}`, relPath);
        remote = await pushFile(drive, localRootPath, relPath);
        rec.state = "OK";
    }

    if (remote) { rec.tsRemote = remote.ts; }
    if (local) { rec.tsLocal = local.ts; }

    return rec;
}

export const syncFile = async (sync, _sync, state, relPath, loggerOnce = (()=>{})) => {
    const { localRootPath } = sync;
    const { db, drive, logger } = _sync;
    const log = (...a)=>{ logger(...a); loggerOnce(...a); }

    try { await drive.ping(); }
    catch(err) { log(err.message); return; }

    relPath = normalizeRelPath(relPath);
    const absPath = path.join(localRootPath, relPath);

    const rec = { ...await db.get(relPath), state };
    await db.set(relPath, rec);

    const [remote, local] = await Promise.all([
        remoteStat(drive, relPath),
        localStat(absPath)
    ]);

    await db.set(relPath, await _sync2(_sync, localRootPath, relPath, rec, local, remote, log));
}



export const syncFiles = async (sync, _sync, loggerOnce = (()=>{})) => {
    const { localRootPath } = sync;
    const { db, drive, logger } = _sync;
    const log = (...a)=>{ logger(...a); loggerOnce(...a); }

    try { await drive.ping(); }
    catch(err) { log(err.message); return; }

    const [remotes, locals, recs] = await Promise.all([
        mapRemote(drive, log, sync.caseSensitive),
        mapLocal(localRootPath),
        db.getAll()
    ]);

    const relPaths = new Set([...remotes.keys(), ...locals.keys(), ...recs.keys()]);

    for (const relPath of relPaths) {
        const rec = recs.get(relPath);
        const local = locals.get(relPath);
        const remote = remotes.get(relPath);
        await db.set(relPath, await _sync2(_sync, localRootPath, relPath, rec, local, remote, log));
    }

    await db.optimize();
}
