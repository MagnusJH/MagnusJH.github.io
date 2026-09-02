from PIL import Image
from rich.console import Console
import cv2
from flask import Flask, render_template, request, jsonify
import tempfile
import os

CHAR_DENSITY = ".,-~:;_!^*|/\\ircvunxzoa()[]?#&8B@%$MW"
# CHAR_DENSITY = "WM$%@B8&#?][)(aozxnuvcri\\/|*^!_;:~-,."       Reverse Density
IMAGE_SCALE = 2
LIVE_CAPTURE_NAME = "live_video"
console = Console()
app = Flask(__name__)

# route that main html page will use
@app.route("/")
def index():
    return render_template("index.html")

# route to receive data from JS, process the data, and send information back
@app.route("/api/process", methods=["POST"])
def process_data():
    # python processing code
    def take_video(video):

        # create temp file to write video data onto (remember to delete it at the end)
        temp_file = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        try:
            # write the video data to the temporary file
            temp_file.write(video)
            temp_file.flush()
            temp_file.close()

            cap = cv2.VideoCapture(temp_file.name)

            # make sure the video is opened
            if not cap.isOpened():
                return jsonify({"error": "Could not open the video."})

            # store each individual frame
            full_text_frames = []

            # start video with the space bar
            while True:
                # capture frames
                ret, frame = cap.read()

                # notify user if camera fails
                if not ret:
                    print("Reached end of Video")
                    break

                # flip frame so it appears mirrored
                mirrored_frame = cv2.flip(frame, 1)

                # save image
                img_name = LIVE_CAPTURE_NAME + ".jpg"
                cv2.imwrite(img_name, mirrored_frame)

                # convert frame to text
                with Image.open(img_name) as img:
                    ascii_img = convert_image(img)
                    full_text_frames.append(ascii_img)

        # manually delete the file
        finally: 
            # close the camera objects
            cap.release()
            os.unlink(temp_file.name)

        return jsonify({"frames": full_text_frames})

    def convert_image(img):

        # get the size of the image
        width, height = img.size

        # convert the height to print only 1,000 lines
        scaled_height = int(height / IMAGE_SCALE)
        # convert the width to the same ratio as the height
        scaled_width = int(width / IMAGE_SCALE)

        # convert the image to grayscale
        grayscale_img = img.convert('L')

        line = ""
        full_text = ""
        # loop through the pixels on the image
        for h in range(0, scaled_height):
            full_text += line + "\n"
            line = ""
            for w in range(0, scaled_width):

                # grab the brightness of the specific pixel
                brightness = grayscale_img.getpixel((w*IMAGE_SCALE, h*IMAGE_SCALE))

                # convert brightness scale to ascii brightness scale
                p = int(brightness * ((len(CHAR_DENSITY)-1) / 255))
                line += CHAR_DENSITY[p] + " "

        return full_text

    # check for valid video files
    if "video_blob" not in request.files:
        return jsonify({"error": "No Video File Found"});

    # retrieve the video blob file
    video = request.files["video_blob"]

    # check if it is a valid video
    if video.filename == "":
        return jsonify({"error": "Empty Filename"});

    # retrieve the video data itself
    video_data = video.read()

    return take_video(video_data)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

