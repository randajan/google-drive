import path from "path";
import createFileDB from "@randajan/file-db";


export const createDB = (rootPath) => {

    const file = createFileDB({
        dir: path.dirname(rootPath)
    }).link("." + path.basename(rootPath), { timeout:3000 });
    const mapPromise = file.optimize().then(_=>file.entries()).then(e=>new Map(e));

    file.set = async (relPath, data)=>{
        const map = await mapPromise;
        if (data != null) {
            data.ts = Date.now();
            await file.write(relPath, data);
            map.set(relPath, data);
            return {...data};
        } else if (map.has(relPath)) {
            await file.write(relPath);
            map.delete(relPath);
            return {};
        }
        
    }

    file.get = async (relPath)=>{
        const map = await mapPromise;
        const rec = map.get(relPath);
        return rec ? {...rec} : {};
    }

    file.getAll = async ()=>new Map(await mapPromise);

    return file;
}