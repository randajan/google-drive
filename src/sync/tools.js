import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { lookup as mimeLookup } from "mime-types";
import { readFile } from "../drive/pull";


export const localFormat = (file)=>{
    file.ts = Math.round(file.mtimeMs);
    return file;
}

export const remoteFormat = (file)=>{
    file.ts = new Date(file.modifiedTime).getTime();
    file.cts = new Date(file.createdTime).getTime();
    return file;
}

export const localStat = async (absPath)=>{
    const stats = await fsp.stat(absPath).catch(()=>{});
    if (stats) { return localFormat(stats); }
}

export const remoteStat = async (drive, relPath)=>{
    const stats = await drive.getFile(relPath).catch(()=>{});
    if (stats) { return remoteFormat(stats); }
}

export const pushFile = async (drive, localRootPath, relPath) => {
    const absPath = path.join(localRootPath, relPath);

    const mimeType = mimeLookup(absPath) || "application/octet-stream";
    const content = fs.createReadStream(absPath);
    return remoteFormat(await drive.ensureFile(relPath, content, mimeType));
}

export const pullFile = async (drive, absPath, fileId) => {
    await fsp.mkdir(path.dirname(absPath), { recursive: true });

    const content = await readFile(drive.api, fileId);
    await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(absPath);
        content
            .on("error", reject)
            .pipe(ws)
            .on("error", reject)
            .on("finish", resolve);
    });

    return localStat(absPath);
}

export const mapLocal = async (rootDir) => {
    const result = new Map();

    const walk = async (currentDir, relBase = "") => {
        const entries = await fsp.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const entryAbsPath = path.join(currentDir, entry.name);
            const entryRelPath = path.join(relBase, entry.name).replace(/\\/g, "/");

            if (entry.isFile()) {
                result.set(entryRelPath, await localStat(entryAbsPath));
            }
            else if (entry.isDirectory()) {
                await walk(entryAbsPath, entryRelPath);
            }
        }
    };

    await walk(rootDir);
    return result;
};

export const mapRemote = async (drive, log, caseSensitive=false) => {
    const result = new Map();
    const dedup = new Map();

    const walk = async (parentId, relBase = "") => {
        await drive.map(parentId, async (file) => {
            file = remoteFormat(file);

            const relPath = file.relPath = (relBase ? `${relBase}/` : "") + file.name;
            if (drive.isNativeFile(file)) { log("Excluded native file", relPath); return; }

            //detect duplicates because at Google drive they are possible
            const rpCheck = caseSensitive ? relPath : relPath.toLowerCase();
            const bro = dedup.get(rpCheck);
            if (bro) {
                if (bro.cts < file.cts) { log("Excluded duplicate", relPath); return; }
                log("Excluded duplicate", bro.relPath);
                result.delete(bro.relPath);
                dedup.delete(rpCheck);
            }
            dedup.set(rpCheck, file);
            
            if (drive.isFile(file)) {
                result.set(relPath, file);
            } else if (drive.isFolder(file)) {
                await walk(file.id, relPath);
            }
        });
    };

    await walk(drive.rootId);

    return result;
};
