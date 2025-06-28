import { google } from "googleapis";
import { solids } from "@randajan/props";

export default (auth, calendarId)=>new GoogleCalendar(auth, calendarId);

export class GoogleCalendar {
    constructor(auth, calendarId) {
        solids(this, {
            api: google.calendar({ version: "v3", auth }),
            calendarId,
        });
    }

    async getEventsList(maxResults = 2500) {
        const { api, calendarId } = this;
        const events = await api.events.list({ calendarId, maxResults });
        return events.data.items;
    }

    async getEventsIndex(maxResults = 2500) {
        const events = await this.getEventsList(maxResults);
        const index = {};
        events.forEach(e => { if (e.id) { index[e.id] = e; } });
        return index;
    }

    async addEvent(resource, sendUpdates="all") {
        const { api, calendarId } = this;
        const event = await api.events.insert({ calendarId, resource, sendUpdates });
        return event?.data?.id;
    }

    async updateEvent(eventId, resource, sendUpdates="all") {
        const { api, calendarId } = this;
        await api.events.update({ calendarId, eventId, resource, sendUpdates });
        return eventId;
    }

    async removeEvent(eventId) {
        const { api, calendarId } = this;
        await api.events.delete({ calendarId, eventId });
        return eventId;
    }
}