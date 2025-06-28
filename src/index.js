
import { info, log } from "@randajan/simple-lib/lib";
import { effaceScopes } from "./auth/scopes";
import { extendURL } from "./tools";
import { OAuthClient } from "./auth/Client";

export default (options)=>new OAuthClient(options);

export {
    OAuthClient
}

export {
    effaceScopes,
    extendURL
}