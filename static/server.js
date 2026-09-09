// camera variables
let mediaRecorder;
let recordedChunks = [];
let localStream;
let replay;
let stop_replay;
let uploaded_video = null;
let height;

// constants for the rest of the program
const live_video = document.getElementById("live-video");
const ascii_box = document.getElementById("ascii-box");
const output = document.getElementById("output");
const fps_selection = document.getElementById("fps-selection");
let replay_fps = fps_selection.value;

// buttons
const start_button = document.getElementById("start-button");
const stop_button = document.getElementById("stop-button");
const reset_button = document.getElementById("reset-button");
const replay_button = document.getElementById("replay-button");
const begin_processing_button = document.getElementById("begin-processing-button");

// button container
const button_container = document.getElementById("button-container");

// sidebar elements
const sidebar = document.getElementById("sidebar");
const sidebar_open = document.getElementById("sidebar-open");
const sidebar_close = document.getElementById("sidebar-close");
const live_video_button = document.getElementById("live-video-button");
const upload_video_button = document.getElementById("upload-video-button");

// constants to switch between for upload or live video
const video_section = document.getElementById("video");
const upload_section = document.getElementById("upload");
const file_input = document.getElementById("file-input");
const file_list = document.getElementById("file-list");
const drop_menu = document.getElementById("drop-menu");

const video_title = document.getElementById("video-title");
const video_description = document.getElementById("video-description");

// delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Request camera access
async function setupCamera() {
    try {
        // get permission
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                frameRate: { ideal: fps_selection.value, max: 90}
            }
        });

        // render livestream
        live_video.srcObject = localStream;
    } catch(err) {
        console.log("Error accessing camera:", err);
        alert("Could not access camera.");
    }
}

// initialize camera setup
setupCamera();

fps_selection.addEventListener("change", function() {
    setupCamera();
});

// start button will start the recording
start_button.addEventListener("click", function() {

    // reset font size
    output.style.fontSize = "14px";

    // choose supported format
    const options = {mimeType: "video/webm; codecs vp9"};

    // initialize mediaRecorder with the stream
    mediaRecorder = new MediaRecorder(localStream, options);

    // record as video data becomes available
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    // start recording in 1 second chunks
    mediaRecorder.start();

    // disable buttons so that it doesn't get messed up
    start_button.disabled = true;
    stop_button.disabled = false;
    reset_button.disabled = true;
    output.value = "Recording started...";
});

// add action to stop button
stop_button.addEventListener("click", () => {

    // stop the recording
    mediaRecorder.onstop = () => {
        // setup the video data to send to the backend
        const video_blob = new Blob(recordedChunks, {type: "video/webm"});

        // covert the video
        convertVideo(video_blob, true);
    }

    // stop the video
    mediaRecorder.stop();

    // clear previous data
    recordedChunks = [];

    // re-eneable all buttons
    start_button.disabled = false;
    stop_button.disabled = true;
    reset_button.disabled = false;
});

function convertVideo(video, mirrored) {

    // tell user that the data is being processed
    output.style.fontSize = "14px";
    output.value = "Video processing...";

    // add the video to the form with a field name and file name
    const formData = new FormData();
    formData.append("video_blob", video, "video_blob.webm");

    // add mirrored boolean to enable or disable mirroring the video
    formData.append("mirrored", mirrored ? "1" : "0");

    // run the python code
    let fps;
    fetch("/convert", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error != null) {
            output.value = data.error;
        } else {
            // store the replay into variable
            replay = data.frames;
            replay_fps = data.fps;
            console.log(replay_fps);
            height = data.height;

            // play the video
            displayAsciiVideo(replay_fps);
        }
    })
    .catch(error => {
        output.value = "Compute time exceeded (120 sec). Try a shorter video!";
        console.error("Error:", error);
    });

    return fps;
}

// reset text to the default value
reset_button.addEventListener("click", function() {
    output.style.fontSize = "14px";
    output.value = output.defaultValue;
    ascii_box.style.height = "700px";
    output.style.height = "calc(100% - 100px)";
    // stop replay if happening
    stop_replay = true;
});

// this function loops through each frame of the ascii video and displays it to the screen
async function displayAsciiVideo(fps) {
    
    // ensure there is a replay 
    if (replay == null) {
        output.value = "No replay currently available...";
        return;
    }

    // change font size
    output.style.fontSize = "2px";

    // change the height to match the video height
    ascii_box.style.height = height*3 + "px";
    output.style.height = (height*3 - 125) + "px";

    // re allow replay to run
    stop_replay = false;

    // display video 
    for (const rep of replay) {
        if (stop_replay) {
            break;
        }

        // display the video frame by frame
        output.value = rep;
        await delay(1000 / fps);
    }
}

// play the ascii version of the video frame by frame
replay_button.addEventListener("click", function() {
    // output each frame one by one
    displayAsciiVideo(replay_fps);
});

// this function opens the sidebar
sidebar_open.addEventListener("click", function() {
    sidebar.classList.add("open");
});
// close the sidebar
sidebar_close.addEventListener("click", function() {
    sidebar.classList.remove("open");
});

// change the layout to the upload version
upload_video_button.addEventListener("click", function() {

    // convert to upload text
    video_title.textContent = "Upload Video";
    video_description.textContent = "Upload a video to convert to ASCII art.";

    // disable live video and enable upload
    video_section.classList.add("hidden");
    upload_section.classList.remove("hidden");

    // disable start and stop buttons and enable begin processsing button
    start_button.classList.add("hidden");
    stop_button.classList.add("hidden");
    begin_processing_button.classList.remove("hidden");

    // remove the fps selection
    drop_menu.classList.add("hidden");

    // change the button layout
    button_container.classList.add("upload-buttons");

    // set the availability of the section buttons
    upload_video_button.disabled = true;
    live_video_button.disabled = false;

    // close the sidebar
    sidebar.classList.remove("open");
});

// change the layout to the live video versoin
live_video_button.addEventListener("click", function() {

    // convert to live camera text
    video_title.textContent = "Live Camera Feed";
    video_description.textContent = "Record a video to convert to ASCII art.";

    // disable upload and enable live video
    upload_section.classList.add("hidden");
    video_section.classList.remove("hidden");

    // disable begin processing button and enable start and stop buttons
    begin_processing_button.classList.add("hidden");
    start_button.classList.remove("hidden");
    stop_button.classList.remove("hidden");

    // add the fps selection
    drop_menu.classList.remove("hidden");

    // remove the upload button layout
    button_container.classList.remove("upload-buttons");

    // set the availability of the section butttons
    live_video_button.disabled = true;
    upload_video_button.disabled = false;

    // close the sidebar
    sidebar.classList.remove("open");
});

// prevent default operations for drag events
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    upload_section.addEventListener(eventName, e => e.preventDefault());
});

// porvide new oeations for drag events
["dragenter", "dragover"].forEach(eventName => {
    upload_section.addEventListener(eventName, () => upload_section.classList.add("drag-over"));
});
["dragleave", "drop"].forEach(eventName => {
    upload_section.addEventListener(eventName, () => upload_section.classList.remove("drag-over"));
});

upload_section.addEventListener("click", function() {
    file_input.click();
});

// handle the dropped files
upload_section.addEventListener("drop", function(e) {
    const files = e.dataTransfer.files;
    file_input.files = files;
    handleFiles(files)
});

// handle the clicked files
file_input.addEventListener("change", function(e) {
    const files = e.target.files;
    handleFiles(files);
})

// this function handles the files given and sends them to the backend
function handleFiles(files) {
    // reload text if changed
    const text = document.getElementById("upload-file-text");
    text.textContent = "Drag and drop your files here, or click to upload (.mp4, .mpv, .mpeg)";

    // check for one file
    if (files.length != 1) {
        text.textContent = "Will not process more than one video.";
        return;
    }

    // check to make sure it is a video type format
    if (files[0].type != "video/mp4" && files[0].type != "video/mpv" && files[0].type != "video/mpeg") {
        text.textContent = "Invalid File Type (.mp4, .mpv, .mpeg)";
        return;
    }

    uploaded_video = files[0];
}

begin_processing_button.addEventListener("click", function() {
    if (uploaded_video != null) {
        convertVideo(uploaded_video, false);
    }
})