import { google } from "googleapis";
import { solids, cached } from "@randajan/props";
import { sliceMap } from "../tools";

export default (auth, groupId, fields)=>new GooglePeople(auth, groupId, fields);

export class GooglePeople {
    constructor(auth, groupId, fields) {
        solids(this, {
            api: google.people({ version: 'v1', auth }),
            groupId,
            fields
        });

        cached(this, {}, "_group", _=>this._fetchGroup(true));
    }

    msg(text) { return `GooglePeople: group '${this.groupId}' ` + text; }

    async _initGroup(throwError = true) {
        const { api, groupId } = this;
        const res = await api.contactGroups.create({ requestBody: { contactGroup:{ name: groupId } } });
        const group = res?.data;
        if (group) { return group; }
        if (throwError) { throw Error(this.msg(`initialize failed`)); }
    }

    async _findGroup(throwError = true) {
        const { api, groupId } = this;
        const res = await api.contactGroups.list();
        const group = res?.data?.contactGroups?.find(g => g.name === groupId);
        if (group) { return group; }
        if (throwError) { throw Error(this.msg(`was not found`)); }
    }

    async _fetchMembersRaw(groupResourceName, throwError=true) {
        const { api } = this;
        const res = await api.contactGroups.get({
            resourceName:groupResourceName,
            maxMembers: 10000,
        });
        const data = res?.data
        if (data) { return data?.memberResourceNames || []; }
        if (throwError) { throw Error(this.msg(`members was not found`)); }
    }

    async _fetchMembers(groupResourceName, throwError=true) {
        const { api, fields } = this;
        const membersRaw = await this._fetchMembersRaw(groupResourceName, throwError);
        const slices = [];
        for (const resourceNames of sliceMap(membersRaw, 200)) {
            const res = await api.people.getBatchGet({ resourceNames, personFields:fields });
            const peoples = res?.data?.responses?.map(r=>r.person);
            if (peoples) { slices.push(peoples); }
            else if (throwError) { throw Error(this.msg(`failed to fetch members fields '${fields}'`)); }
            else { return []; }
        }
        return [].concat(...slices);
    }

    async _fetchGroup(autoCreate = false, throwError = true) {
        const group = await this._findGroup(!autoCreate && throwError);
        if (!group) { return {...await this._initGroup(throwError), members:[] } }
        group.members = await this._fetchMembers(group.resourceName, throwError);
        if (group.members) { return group; }
    }

    async mapMembers(callback) {
        const { members } = await this._group;
        return members?.map(callback);
    }

    async removeContacts(resourceNamesList) {
        if (!resourceNamesList.length) { return; }
        for (const resourceNames of sliceMap(resourceNamesList, 500)) {
            await this.api.people.batchDeleteContacts({ requestBody: { resourceNames } });
        }
        return resourceNamesList.length;
    }

    async updateContacts(contactsEntries) {
        if (!contactsEntries.length) { return; }
        for (const entries of sliceMap(contactsEntries, 200)) {
            await this.api.people.batchUpdateContacts({ requestBody:{ contacts:Object.fromEntries(entries), updateMask:this.fields } })
        }
        return contactsEntries.length;
    }

    async createContacts(contactsList) {
        if (!contactsList.length) { return; }
        const { api } = this;
        const { resourceName } = await this._group;
        const add = [];
        for (const contacts of sliceMap(contactsList, 200)) {
            const res = await api.people.batchCreateContacts({ requestBody:{ contacts }, readMask:"names" });
            res?.data?.createdPeople?.forEach(c=>{
                const rn = c?.person?.resourceName;
                if (rn) { add.push(rn); }
            });
        }
        for (const resourceNamesToAdd of sliceMap(add, 1000)) {
            await api.contactGroups.members.modify({ requestBody:{ resourceNamesToAdd }, resourceName });
        }
        return contactsList.length;
    }

}
