import slib, { argv } from "@randajan/simple-lib";

const { isServer, isBuild } = argv;

slib(
    isBuild,
    {
        rebuildBuffer:isServer ? 500 : 100,
        mode:isServer ? "node" : "web",
        demo:{
            dir: isServer ? "demo/be" : "demo/fe",
            loader:{
                ".json":"text"
            }
        },
        lib:{
            entries:[
                "index.js",
                "./sync/index.js"
            ]
        },
    }
);