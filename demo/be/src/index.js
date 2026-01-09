
import { info, log } from "@randajan/simple-lib/node";
import { GoogleOAuth2 } from "@randajan/oauth2-client/google";
import { GoogleDriveSync } from "../../../dist/esm/sync/index.mjs";
import createPulse from "@randajan/pulse";
import express from 'express';
import path from "path";

import cors from "cors";

import envJson from "./.env.json";

const env = JSON.parse(envJson);

const oauth = new GoogleOAuth2({
    isOffline:true,
    landingUri:"http://localhost:3000",
    fallbackUri:"http://localhost:3000",
    scopes:[
        "drive"
    ],
    onAuth:async (account)=>{
        console.log(await account.tokens());
    },
    onRenew:(account)=>{

    },
    ...env
});

const account = oauth.account({access_token:env.token});
const gsync = new GoogleDriveSync({
    mode:"MERGE",
    auth:account.auth,
    remoteRootId:"17BTF1AQJ6ADpjmZF6_oduDMenbs9Nn3I",
    localRootPath:path.join(info.dir.root, info.dir.dist, "../drive"),
    caseSensitive:false,
    logger:(event, ...a)=>{
        if (event !== "Sweep" && event !== "Ok") { console.log(event, ...a); }
    }
});

createPulse({
    autoStart:true,
    interval:5000,
    onPulse:async _=>{
        console.log("---");
        await gsync.sync().catch(console.error);
    }
});

const app = express();
const PORT = 3999;


app.use(cors());


app.get("/oauth/google/init", (req, res)=>{
    const { query } = req;
    const url = oauth.getInitAuthURL(query.landingUri);
    res.redirect(url);
});


app.get("/oauth/google/exit", async (req, res)=> {
    const { query } = req;
    const redirect = await oauth.getExitAuthURL(query.code, query.state);
    res.redirect(redirect);
});

app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
