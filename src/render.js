const https = require("https")
const fs = require("fs")
const util = require("util")
const stream = require("stream")

const startDownloadBtn = document.getElementById('startDownloadBtn')
startDownloadBtn.addEventListener("click", startDownload)

const isEmpty = str => !str.trim().length

async function startDownload() {
    const urlInput = document.getElementById('urlInput');
    const filenameInput = document.getElementById('filenameInput');
    const speedLimitInput = document.getElementById('speedLimitInput');

    // Check if the input fields are empty to throw up an error and not allow the download to start
    let emptyInputField = false;
    if (isEmpty(urlInput.value)) {
        // console.log("URL is empty")
        urlInput.classList.add("is-danger")
        emptyInputField = true;
    } else {
        urlInput.classList.remove("is-danger")
    }

    if (isEmpty(filenameInput.value)) {
        // console.log("Filename is empty")
        filenameInput.classList.add("is-danger")
        emptyInputField = true;
    } else {
        filenameInput.classList.remove("is-danger")
    }

    if (isEmpty(speedLimitInput.value)) {
        // console.log("Speedlimit is empty")
        speedLimitInput.classList.add("is-danger")
        emptyInputField = true;
    } else {
        speedLimitInput.classList.remove("is-danger")
    }

    if (!emptyInputField) {
        console.log("Downloading...")

        urlInput.disabled = true;
        filenameInput.disabled = true;
        speedLimitInput.disabled = true;

        document.getElementById("finishedText").innerHTML = ""

        downloadWithBackpressure(urlInput.value, filenameInput.value, speedLimitInput.value)
    }
}

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
        fs.createWriteStream("downloaded/" + filename)
    );
    const elapsed = (Date.now() - startDate) / 1000;
    document.getElementById("finishedText").innerHTML = `${roundNumber(totalSize / 1024 / 1024, 3)} mb of data downloaded in ${roundNumber(elapsed, 3)} seconds with a speed of ${roundNumber(totalSize / 1024 / elapsed, 3)} kb/s`
    
    urlInput.disabled = false;
    filenameInput.disabled = false;
    speedLimitInput.disabled = false;

    urlInput.value = "";
    filenameInput.value = "";
    speedLimitInput.value = "";

}

// ** means exponent
function roundNumber (input, decimalPlace) {
    return Math.round(input * (10 ** decimalPlace)) / (10 ** decimalPlace)
}