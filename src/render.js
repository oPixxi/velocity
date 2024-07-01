const https = require("https");
const fs = require("fs");
const util = require("util");
const stream = require("stream");
const path = require("path");
const { ipcRenderer } = require("electron");
const { url } = require("inspector");
const ipc = ipcRenderer;

// Calls scripts
require("./title-bar");

const startDownloadBtn = document.getElementById('startDownloadBtn');
startDownloadBtn.addEventListener("click", startDownload);
const folderSelectBtn = document.getElementById('folderSelectBtn');
folderSelectBtn.addEventListener("click", folderSelection);

const urlInput = document.getElementById('urlInput');
const filenameInput = document.getElementById('filenameInput');
const speedLimitInput = document.getElementById('speedLimitInput');

urlInput.addEventListener("input", () => { if (urlInput.value != "") urlInput.classList.remove("is-danger"); else urlInput.classList.add("is-danger")});
filenameInput.addEventListener("input", () => { if (filenameInput.value != "") filenameInput.classList.remove("is-danger"); else filenameInput.classList.add("is-danger") });
speedLimitInput.addEventListener("input", () => { if (!speedLimitInput.value) speedLimitInput.classList.remove("is-danger"); else speedLimitInput.classList.add("is-danger") });

const isEmpty = str => !str.trim().length;
const roundNumber = (input, decimalPlace) => Math.round(input * (10 ** decimalPlace)) / (10 ** decimalPlace);
let dir = null;

async function startDownload() {
    // Check if the input fields are empty to throw up an error and not allow the download to start
    let emptyInputField = false;
    if (isEmpty(urlInput.value)) {
        // console.log("URL is empty")
        urlInput.classList.add("is-danger");
        emptyInputField = true;
    };

    if (isEmpty(filenameInput.value)) {
        // console.log("Filename is empty");
        filenameInput.classList.add("is-danger");
        emptyInputField = true;
    };

    if (speedLimitInput.value || speedLimitInput.value == 0) {
        speedLimitInput.classList.add("is-danger");
        emptyInputField = true;
    };

    if (dir == null) {
        folderSelectBtn.classList.add("is-danger");
        emptyInputField = true;
    };

    if (!emptyInputField) {
        console.log("Downloading...");

        urlInput.disabled = true;
        filenameInput.disabled = true;
        speedLimitInput.disabled = true;

        document.getElementById("finishedText").innerHTML = "";

        downloadWithBackpressure(urlInput.value, filenameInput.value, speedLimitInput.value);
    };
};

async function downloadWithBackpressure(url, filename, speedLimitInKb) {
    let startDate = Date.now();
    let totalSize = 0;
    let quota = speedLimitInKb * 1024;
    let lastSecondStart;
    await util.promisify(stream.pipeline)(
        //@ts-ignore
        await new Promise(resolve => https.get(url, res => {
            startDate = Date.now();
            lastSecondStart = Date.now();
            resolve(res);
        })),
        new stream.Transform({
            highWaterMark: 1,
            transform: async (chunk, _encoding, next) => {
                totalSize += chunk.length;
                quota -= chunk.length;
                if (quota <= 0 || Date.now() - lastSecondStart > 1000) {
                    await new Promise(resolve => setTimeout(resolve, 1000 - (Date.now() - lastSecondStart)));
                    quota = speedLimitInKb * 1024;
                    lastSecondStart = Date.now();
                }
                next(null, chunk);
            }
        }),
        fs.createWriteStream(path.join(dir, filename))
    );
    const elapsed = (Date.now() - startDate) / 1000;
    document.getElementById("finishedText").innerHTML =
    `${roundNumber(totalSize / 1024 / 1024, 3)} mb of data downloaded in ${roundNumber(elapsed, 3)} seconds with a speed of ${roundNumber(totalSize / 1024 / elapsed, 3)} kb/s`;
    
    urlInput.disabled = false;
    filenameInput.disabled = false;
    speedLimitInput.disabled = false;

    urlInput.value = "";
    filenameInput.value = "";
    speedLimitInput.value = "";
}

async function folderSelection() {
    const pickerDir = await ipc.invoke("folderOpen");
    if (!pickerDir.canceled) {
        dir = pickerDir.filePaths[0];
        folderSelectBtn.classList.remove("is-danger");
    };
    console.log(dir);
};