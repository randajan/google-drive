
import { info, log } from "@randajan/simple-lib/node";
import { GoogleOAuth2 } from "@randajan/oauth2-client/google";
import { GoogleDriveSync } from "../../../dist/esm/sync/index.mjs";
import express from 'express';
import path from "path";

import cors from "cors";

import envJson from "./.env.json";

const env = JSON.parse(envJson);

const oauth = new GoogleOAuth2({
    isOffline:true,
    landingUri:"http://localhost:3000",
    fallbackUri:"http://localhost:3000",
    // scopes:[
    //     "drive"
    // ],
    onAuth:async (account)=>{
        console.log(await account.tokens());
    },
    onRenew:(account)=>{

    },
    ...env
});

const account = oauth.account({access_token:env.token});
const gsync = new GoogleDriveSync({
    auth:account.auth,
    remoteRootId:"102xPBlMF5InhmH6JQbs-YAZPN-v-2Xe-",
    localRootPath:path.join(info.dir.root, info.dir.dist, "../drive"),
    caseSensitive:false,
    debug:console.log
});

gsync.refresh().catch(console.error);

const app = express();
const PORT = 3999;


app.use(cors());


app.get("/oauth/init", (req, res)=>{
    const { query } = req;
    const url = oauth.getInitAuthURL(query.landingUri);
    res.redirect(url);
});


app.get("/oauth/exit", async (req, res)=> {
    const { query } = req;
    const redirect = await oauth.getExitAuthURL(query.code, query.state);
    res.redirect(redirect);
});

app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
