import { solids } from "@randajan/props";
import fs from "fs";
import { promises as fsp } from "fs";
import { join, dirname } from "path";
import { lookup as mimeLookup } from "mime-types";
import { GoogleDrive } from "./Drive";

export default (auth, remoteRootId, localRootPath, defaultFields=[])=>{
    return new GoogleDriveSync(auth, remoteRootId, localRootPath, defaultFields);
}


export class GoogleDriveSync {
    constructor(auth, remoteRootId, localRootPath, defaultFields=[]) {
        const drive = new GoogleDrive(auth, remoteRootId, defaultFields);

        solids(this, {
            drive,
            remoteRootId,
            localRootPath
        });
    }

    msg(text, file = "") {
        const folder = ` folder '${this.rootId}'`;
        file = file ? ` file '${file}'` : "";
        return `GoogleDriveSync: ${folder}${file} ` + text;
    }

    async pull(relPath) {
        const { drive, localRootPath } = this;
        const localPath = join(localRootPath, relPath);

        await fsp.mkdir(dirname(localPath), { recursive: true });

        const file = await drive.readFile(relPath, true);
        await new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(localPath);
            file.content
                .on("error", reject)
                .pipe(ws)
                .on("error", reject)
                .on("finish", resolve);
        });
    }

    async push(relPath) {
        const { drive, localRootPath } = this;
        const localPath = join(localRootPath, relPath);

        const stat = await fsp.stat(localPath).catch(() => null);
        if (!stat || !stat.isFile()) {
            throw new Error(this.msg("local path isn't file", localPath));
        }

        const mimeType = mimeLookup(localPath) || "application/octet-stream";
        const content = fs.createReadStream(localPath);

        await drive.ensureFile(relPath, content, mimeType);
    }

    async refresh() {

    }
}