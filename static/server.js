// camera variables
let mediaRecorder;
let recordedChunks = [];
let localStream;
let replay;
let stop_replay;

// constants for the rest of the program
const live_video = document.getElementById("live-video");
const output = document.getElementById("output");
const fps_selection = document.getElementById("fps-selection");
let replay_fps = fps_selection.value;

// buttons
const start_button = document.getElementById("start-button");
const stop_button = document.getElementById("stop-button");
const reset_button = document.getElementById("reset-button");
const replay_button = document.getElementById("replay-button");

// delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Request camera access
async function setupCamera() {
    try {
        // get permission
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                frameRate: { ideal: fps_selection.value, max: 60}
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

    // set value of fps for the replay
    replay_fps = fps_selection.value;

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
stop_button.addEventListener("click", function() {

    // stop the recording
    const formData = new FormData();
    mediaRecorder.onstop = () => {
        // tell user that the data is being processed
        output.value = "Video processing...";

        // setup the video data to send to the backend
        const video_blob = new Blob(recordedChunks, {type: "video/webm"});

        // add the video to the form with a field name and file name
        formData.append("video_blob", video_blob, "video_blob.webm");

        // run the python code
        fetch("/", {
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

                // play the video 
                displayAsciiVideo();
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
    }

    // stop the video
    mediaRecorder.stop()

    // clear previous data
    recordedChunks = [];

    // re-eneable all buttons
    start_button.disabled = false;
    stop_button.disabled = true;
    reset_button.disabled = false;
});

// reset text to the default value
reset_button.addEventListener("click", function() {
    output.style.fontSize = "14px";
    output.value = output.defaultValue;
    // stop replay if happening
    stop_replay = true;
});

// this function loops through each frame of the ascii video and displays it to the screen
async function displayAsciiVideo() {
    
    // ensure there is a replay 
    if (replay == null) {
        output.value = "No replay currently available..."
        return
    }

    // change font size
    output.style.fontSize = "2px";

    // re allow replay to run
    stop_replay = false;

    // display video 
    for (const rep of replay) {
        if (stop_replay) {
            break;
        }

        // display the video frame by frame
        output.value = rep;
        await delay((1/replay_fps) * 1000);
    }
}

// play the ascii version of the video frame by frame
replay_button.addEventListener("click", function() {
    // output each frame one by one
    displayAsciiVideo();
});