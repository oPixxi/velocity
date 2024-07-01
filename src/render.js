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

// Accessing HTML elements
const startDownloadBtn = document.getElementById('startDownloadBtn');
const folderSelectBtn = document.getElementById('folderSelectBtn');
const downloadProgresssBar = document.getElementById('downloadProgressBar')
const urlInput = document.getElementById('urlInput');
const filenameInput = document.getElementById('filenameInput');
const speedLimitInput = document.getElementById('speedLimitInput');

// Adding event listeners
startDownloadBtn.addEventListener("click", startDownload);
folderSelectBtn.addEventListener("click", folderSelection);
urlInput.addEventListener("input", () => { if (urlInput.value != "") urlInput.classList.remove("is-danger"); else urlInput.classList.add("is-danger")});
filenameInput.addEventListener("input", () => { if (filenameInput.value != "") filenameInput.classList.remove("is-danger"); else filenameInput.classList.add("is-danger") });
speedLimitInput.addEventListener("input", () => { if (speedLimitInput.value) speedLimitInput.classList.remove("is-danger"); else speedLimitInput.classList.add("is-danger") });

// isEmpty() removes any whitespace in strings
// roundNumber() rounds 'input' to the nearest 'decimalPlace'
const isEmpty = str => !str.trim().length;
const roundNumber = (input, decimalPlace) => Math.round(input * (10 ** decimalPlace)) / (10 ** decimalPlace);

let dir = null;

async function startDownload() {
    // Check if the input fields are empty to throw up an error and not allow the download to start
    let emptyInputField = false;
    if (isEmpty(urlInput.value)) {
        urlInput.classList.add("is-danger");
        emptyInputField = true;
    };

    if (isEmpty(filenameInput.value)) {
        filenameInput.classList.add("is-danger");
        emptyInputField = true;
    };

    if (!speedLimitInput.value || speedLimitInput.value == 0) {
        speedLimitInput.classList.add("is-danger");
        emptyInputField = true;
    };

    if (dir == null) {
        folderSelectBtn.classList.add("is-danger");
        emptyInputField = true;
    };

    if (!emptyInputField) {

        urlInput.disabled = true;
        filenameInput.disabled = true;
        speedLimitInput.disabled = true;

        document.getElementById("finishedText").innerHTML = "";

        downloadWithBackpressure(urlInput.value, path.join(dir, filenameInput.value), speedLimitInput.value * 1024);
    };
};

async function downloadWithBackpressure(url, filePath, byteRate) {
    const before = Date.now();
    let totalBytesDownloaded = 0;
    let contentLength = null; // May not exist
    const timeBeforeStart = Date.now();
    await util.promisify(stream.pipeline)(
    // Start the download stream
    await new Promise(resolve => {
        https.get(url, res => {
            contentLength = res.headers['content-length'];
            resolve(res)
        })
    }), 
    // Throttle data by combining setTimeout with a stream.Transfer
    new stream.Transform({
        transform: async (chunk, encoding, next) => {
            // Accumulate the total number of bits received
            totalBytesDownloaded += chunk.byteLength;
            downloadProgresssBar.value = (totalBytesDownloaded / contentLength) * 100
            // Sleep to throttle towards desired transfer speed
            const sleepMs = Math.max(0, (totalBytesDownloaded / byteRate * 1000) - Date.now() + timeBeforeStart);
            sleepMs && await new Promise(resolve => setTimeout(resolve, sleepMs));
            // Propagate the chunk to the stream writable
            next(null, chunk);
        }
    }), 
    // Save the file to disk
    fs.createWriteStream(filePath));

    const duration = Date.now() - before;

    document.getElementById("finishedText").innerHTML =
    `${roundNumber(totalBytesDownloaded / 1024 / 1024, 3)} mb of data downloaded in ${duration / 1000} seconds with a speed of ${roundNumber((totalBytesDownloaded / 1024 * 1000) / duration, 3)} kb/s`;
    
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
};