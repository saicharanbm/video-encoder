const ffmpeg = require("fluent-ffmpeg");
const { S3 } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
require("dotenv/config");
const fs = require("fs");
const path = require("path");

if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION
) {
  throw new Error("AWS credentials not found");
}

const s3 = new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// Function to convert video and upload to S3

function convertVideo(inputPath, bucketName, s3Key, width, height) {
  const tempOutputPath = path.join(__dirname, "temp_output.mp4");

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(`-vf scale=${width}:${height}`)
      .audioCodec("copy")
      .format("mp4")
      .on("end", async () => {
        try {
          const fileStream = fs.createReadStream(tempOutputPath);

          const upload = new Upload({
            client: s3,
            params: {
              Bucket: bucketName,
              Key: s3Key,
              Body: fileStream,
            },
          });

          await upload.done();

          // Clean up temp file
          fs.unlinkSync(tempOutputPath);

          resolve(`Video converted and uploaded to S3: ${s3Key}`);
        } catch (uploadErr) {
          reject(uploadErr);
        }
      })
      .on("error", (err) => {
        console.error("FFmpeg Error:", err);
        reject(err);
      })
      .save(tempOutputPath);
  });
}

// Usage
const inputVideoPath = "input/video.mp4"; // Local video path
const bucketName = "transcoded-video.saicharanbm.in";
const s3Key = "converted-video/output_720p.mp4"; // S3 file path

convertVideo(inputVideoPath, bucketName, s3Key, 1280, 720)
  .then((message) => console.log(message))
  .catch((err) => console.error("Error during conversion/upload:", err));

// Function to convert video to specified resolution
// function convertVideo(inputPath, outputPath, width, height) {
//   return new Promise((resolve, reject) => {
//     ffmpeg(inputPath)
//       .outputOptions(`-vf scale=${width}:${height}`)
//       .audioCodec("copy")
//       .on("end", () => resolve(`Video converted to ${height}p`))
//       .on("error", (err) => reject(err))
//       .save(outputPath);
//   });
// }

// // Paths to input and output videos
// const inputVideoPath = "input/video.mp4";
// const output480pPath = "output/output_480p.mp4";
// const output720pPath = "output/output_720p.mp4";
// const output1080pPath = "output/output_1080p.mp4";

// // Convert to 480p, 720p, and 1080p in parallel
// Promise.all([
//   convertVideo(inputVideoPath, output480pPath, 854, 480),
//   convertVideo(inputVideoPath, output720pPath, 1280, 720),
//   convertVideo(inputVideoPath, output1080pPath, 1920, 1080),
// ])
//   .then(() => {
//     console.log("All videos converted!");
//   })
//   .catch((err) => {
//     console.error("Error during video conversion:", err);
//   });
