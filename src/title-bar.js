const { ipcRenderer } = require("electron");
const ipc = ipcRenderer;

window.addEventListener('resize', windowResize);

document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
});
document.querySelector("#maximize").addEventListener("click", () => {
    ipc.send("manualMaximize");
});
document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
});

function windowResize () {
    if (window.innerWidth < 340) {
        document.getElementById('title').innerHTML = "🚀 VNT";
    } else {
        document.getElementById('title').innerHTML = "🚀 Velocity Network Throttler";
    }
}