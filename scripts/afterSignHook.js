// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db
require("dotenv").config();
require("dotenv").config({path: "./../.env"});
require("dotenv").config({path: "../../.env"});
require("dotenv").config({path: "../../../.env"});
require("dotenv").config({path: "../../../.env"});
require("dotenv").config({path: "../../../../.env"});
const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function (params) {
    console.log("params: ",params)
    // Only notarize the app on Mac OS only.
    if (params.electronPlatformName !== 'darwin') {
        return;
    }
    console.log('appId', process.env.APP_ID);
    console.log('ID', process.env.APPLEID);
    console.log('PW', process.env.APPLEIDPW);

    console.log('afterSign hook triggered', params);

    // Same appId in electron-builder.
    let appId = process.env.APP_ID;

    let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await electron_notarize.notarize({
            appBundleId: appId,
            appPath: appPath,
            appleId: process.env.APPLEID,
            appleIdPassword: process.env.APPLEIDPW,
        });
    } catch (error) {
        console.error(error);
    }

    console.log(`Done notarizing ${appId}`);
    return true
};
