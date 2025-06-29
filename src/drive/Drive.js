import { google } from "googleapis";
import { solids, virtual } from "@randajan/props";
import { getById, getByPath, mapFiles, readFile } from "./pull";
import { _defaultFields, _folderMime, concatFields, isFile, isFolder, isNativeFile, queryFile, queryFolder } from "./helpers";
import { createFolder, deleteById, pushFileByPath, updateFileById } from "./push";

export class GoogleDrive {

    constructor({
        auth,
        rootId,
        defaultFields = []
    }) {
        defaultFields = concatFields(_defaultFields, defaultFields);

        solids(this, {
            api: google.drive({ version: 'v3', auth }),
            rootId,
        });

        virtual(this, "defaultFields", _ => [...defaultFields]);
    }

    msg(text, file = "") {
        const folder = ` folder '${this.rootId}'`;
        file = file ? ` file '${file}'` : "";
        return `GoogleDrive:${folder}${file} ` + text;
    }

    isFolder(any) { return isFolder(any); }
    isFile(any) { return isFile(any); }
    isNativeFile(any) { return isNativeFile(any); }

    async ping(throwError = true) {
        const { api } = this;
        try { await api.about.get({ fields: 'user' }); return 200; }
        catch (err) {
            if (!throwError) { return err.code; }
            throw new Error(this.msg(err.message), { cause:err }); 
        }
    }

    async getById(fileId, fields = []) {
        const { api, defaultFields } = this;
        return getById(api, fileId, concatFields(defaultFields, fields));
    }

    async getFile(relPath, fields = []) {
        return getByPath(this, true, relPath, concatFields(this.defaultFields, fields));
    }

    async getFolder(relPath, fields = []) {
        return getByPath(this, false, relPath, concatFields(this.defaultFields, fields));
    }

    async readFileById(fileId, stream = true, fields = []) {
        const file = await this.getById(fileId, fields);
        if (!file) { throw new Error(this.msg(`id doesn't exists`, fileId)); }
        if (!this.isFile(file)) { throw new Error(this.msg(`id isn't file`, fileId)); }
        file.content = await readFile(this.api, fileId, stream);
        return file;
    }

    async readFile(relPath, stream = true, fields = []) {
        const file = await getByPath(this, true, relPath, concatFields(this.defaultFields, fields));
        file.content = await readFile(this.api, file.id, stream);
        return file;
    }

    async updateFileById(fileId, content, mimeType = "text/plain", fields = []) {
        const { api, defaultFields } = this;
        return updateFileById(api, fileId, content, mimeType, concatFields(defaultFields, fields));
    }

    async updateFile(relPath, content, mimeType = "text/plain", fields = []) {
        return pushFileByPath(this, relPath, content, mimeType, concatFields(this.defaultFields, fields), false, true);
    }

    async createFile(relPath, content, mimeType = "text/plain", fields = []) {
        return pushFileByPath(this, relPath, content, mimeType, concatFields(this.defaultFields, fields), true, false);
    }

    async ensureFile(relPath, content, mimeType = "text/plain", fields = []) {
        return pushFileByPath(this, relPath, content, mimeType, concatFields(this.defaultFields, fields), true, true);
    }

    async createFolder(parentId, name, fields = []) {
        const { api, rootId, defaultFields } = this;
        return createFolder(api, parentId || rootId, name, concatFields(defaultFields, fields));
    }

    async deleteById(fileId) {
        await deleteById(this.api, fileId);
    }

    async deleteFile(relPath) {
        const file = await this.getFile(relPath, ["id"]);
        await this.deleteById(file.id);
    }

    async deleteFolder(relPath) {
        const folder = await this.getFolder(relPath, ["id"]);
        await this.deleteById(folder.id);
    }

    async map(parentId, callback, fields = []) {
        const { api, rootId, defaultFields } = this;
        return mapFiles(api, parentId || rootId, callback, concatFields(defaultFields, fields));
    }

    async createRootFolder(name, fields = []) {
        return this.createFolder(this.rootId, name, fields);
    }

    async mapRoot(callback, fields = []) {
        return this.map(this.rootId, callback, fields);
    }

}