import * as posenet from "@tensorflow-models/posenet";
import * as React from "react";
import { isMobile, drawKeypoints, drawSkeleton } from "./utils";

import { analyzeSquatDepth } from "./squat_depth_cue";
import { analyzeFeetWidth } from "./feet_width_cue";
import { analyzeShoulderAlignment } from "./shoulder_align_cue";
import "../../css/posenet.css";

let shouldersSet = false;
let feetSet = false;
let calibrationConfidenceLevel = 0;
let calibrationComplete = false;
let goodDepth = false;
let repCounter = 0;

let startingLeftHipX = [];
let startingLeftHipY = [];
let startingRightHipX = [];
let startingRightHipY = [];

let startingAvgLeftHipX = 0;
let startingAvgLeftHipY = 0;
let startingAvgRightHipX = 0;
let startingAvgRightHipY = 0;

let distanceLeftHipFromStarting = 0;

function distanceFormula(x1, y1, x2, y2) {
  var result = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
  return result;
}

export default class PoseNet extends React.Component {
  static defaultProps = {
    videoWidth: 600,
    videoHeight: 400,
    flipHorizontal: false,
    algorithm: "single-pose",
    mobileNetArchitecture: isMobile() ? 0.5 : 1.01,
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    minPoseConfidence: 0.5,
    minPartConfidence: 0.5,
    maxPoseDetections: 1,
    nmsRadius: 20.0,
    outputStride: 16,
    imageScaleFactor: 0.5,
    skeletonColor: "aqua",
    skeletonLineWidth: 2,
    loadingText: "Loading pose detector..."
  };

  constructor(props) {
    super(props, PoseNet.defaultProps);
    this.state = {
      loading: true,
      backgroundcolorSA: "red",
      backgroundcolorSD: "red",
      backgroundcolorFW: "red"
    };
  }

  onChangeSA(inputEntry) {
    if (inputEntry) {
      this.setState({ backgroundcolorSA: "green" });
    } else {
      this.setState({ backgroundcolorSA: "red" });
    }
  }
  onChangeSD(inputEntry) {
    if (inputEntry) {
      this.setState({ backgroundcolorSD: "green" });
    } else {
      this.setState({ backgroundcolorSD: "red" });
    }
  }
  onChangeFW(inputEntry) {
    if (inputEntry) {
      this.setState({ backgroundcolorFW: "green" });
    } else {
      this.setState({ backgroundcolorFW: "red" });
    }
  }
  getCanvas = elem => {
    this.canvas = elem;
  };

  getVideo = elem => {
    this.video = elem;
  };

  async componentWillMount() {
    // Loads the pre-trained PoseNet model
    this.net = await posenet.load(this.props.mobileNetArchitecture);
  }

  async componentDidMount() {
    try {
      await this.setupCamera();
    } catch (e) {
      throw "This browser does not support video capture, or this device does not have a camera";
    } finally {
      this.setState({ loading: false });
    }

    this.detectPose();
  }

  async setupCamera() {
    // MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw "Browser API navigator.mediaDevices.getUserMedia not available";
    }

    const { videoWidth, videoHeight } = this.props;
    const video = this.video;
    const mobile = isMobile();

    video.width = videoWidth;
    video.height = videoHeight;

    // MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: mobile ? void 0 : videoWidth,
        height: mobile ? void 0 : videoHeight
      }
    });

    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        // Once the video metadata is ready, we can start streaming video
        video.play();
        resolve(video);
      };
    });
  }

  detectPose() {
    const { videoWidth, videoHeight } = this.props;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    this.poseDetectionFrame(ctx);
  }

  poseDetectionFrame(ctx) {
    const {
      algorithm,
      imageScaleFactor,
      flipHorizontal,
      outputStride,
      minPoseConfidence,
      maxPoseDetections,
      minPartConfidence,
      nmsRadius,
      videoWidth,
      videoHeight,
      showVideo,
      showPoints,
      showSkeleton,
      skeletonColor,
      skeletonLineWidth
    } = this.props;

    const net = this.net;
    const video = this.video;

    const poseDetectionFrameInner = async () => {
      let poses = [];

      switch (algorithm) {
        case "single-pose":
          const pose = await net.estimateSinglePose(
            video,
            imageScaleFactor,
            flipHorizontal,
            outputStride
          );

          poses.push(pose);

          break;
        case "multi-pose":
          poses = await net.estimateMultiplePoses(
            video,
            imageScaleFactor,
            flipHorizontal,
            outputStride,
            maxPoseDetections,
            minPartConfidence,
            nmsRadius
          );

          break;
        default:
          const defaultPose = await net.estimateSinglePose(
            video,
            imageScaleFactor,
            flipHorizontal,
            outputStride
          );

          poses.push(defaultPose);
          break;
      }

      ctx.clearRect(0, 0, videoWidth, videoHeight);
      //console.log(ctx);
      // if (showVideo) {
      //   ctx.save();
      //   ctx.scale(-1, 1);
      //   ctx.translate(-videoWidth, 0);
      //   ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      //   ctx.restore();
      // }

      // For each pose (i.e. person) detected in an image, loop through the poses
      // and draw the resulting skeleton and keypoints if over certain confidence
      // scores

      poses.forEach(({ score, keypoints }) => {
        if (score >= minPoseConfidence) {
          if (!calibrationComplete) {
            if (analyzeFeetWidth(keypoints)) {
              this.onChangeFW(true);
              feetSet = true;
            } else {
              this.onChangeFW(false);
              feetSet = false;
            }

            //this.onChangeFW(true);
            if (analyzeShoulderAlignment(keypoints)) {
              this.onChangeSA(true);
              shouldersSet = true;
            } else {
              this.onChangeSA(false);
              shouldersSet = false;
            }

            if (feetSet && shouldersSet) {
              calibrationConfidenceLevel++;
              startingLeftHipX.push(keypoints[11].position.x);
              startingLeftHipY.push(keypoints[11].position.y);
              startingRightHipX.push(keypoints[12].position.x);
              startingRightHipY.push(keypoints[12].position.y);
            } else {
              calibrationConfidenceLevel = 0;
              startingLeftHipX = [];
              startingLeftHipY = [];
              startingRightHipX = [];
              startingRightHipY = [];
            }

            if (calibrationConfidenceLevel > 75) {
              calibrationComplete = true;
              for (var i = 0; i < 75; i++) {
                startingAvgLeftHipX += startingLeftHipX[i];
                startingAvgLeftHipY += startingLeftHipY[i];
                startingAvgRightHipX += startingRightHipX[i];
                startingAvgRightHipY += startingRightHipY[i];
              }

              startingAvgLeftHipX /= 75;
              startingAvgLeftHipY /= 75;
              startingAvgRightHipX /= 75;
              startingAvgRightHipY /= 75;
              console.log("Calibration complete");
            }
          }

          else {
            if (analyzeSquatDepth(keypoints)) {
              this.onChangeSD(true);
              goodDepth = true;
            }

            distanceLeftHipFromStarting = distanceFormula(startingAvgLeftHipX, startingAvgLeftHipY, keypoints[11].position.x, keypoints[11].position.y);
            if (goodDepth && distanceLeftHipFromStarting < 25) {
              repCounter++;
              console.log(repCounter);
              goodDepth = false;
              this.onChangeSD(false);
            }
          }
          // if (analyzeSquatDepth(keypoints) && calibrationComplete) {
          //   this.onChangeSD(true);
          //   goodDepth = true;
          //   distanceLeftHipFromStarting = distanceFormula(startingAvgLeftHipX, startingAvgLeftHipY, keypoints[11].position.x, keypoints[11].position.y);
          // } else if (goodDepth && distanceLeftHipFromStarting < 50) {
          //     goodDepth = false;
          //     this.onChangeSD(goodDepth);
          //     repCounter++;
          //     console.log(repCounter);
          //   } else {
          //   this.onChangeSD(false);
          // }

          if (showPoints) {
            drawKeypoints(keypoints, minPartConfidence, skeletonColor, ctx);
          }
          if (showSkeleton) {
            drawSkeleton(
              keypoints,
              minPartConfidence,
              skeletonColor,
              skeletonLineWidth,
              ctx
            );
          }
        }
      });

      requestAnimationFrame(poseDetectionFrameInner);
    };

    poseDetectionFrameInner();
  }

  render() {
    const {
      backgroundcolorSA,
      backgroundcolorFW,
      backgroundcolorSD
    } = this.state;
    const loading = this.state.loading ? (
      <div className="PoseNet__loading">{this.props.loadingText}</div>
    ) : (
      ""
    );
    let textSD;
    let textFW;
    let textSA;
    if (backgroundcolorSD === "red") {
      textSD = "Bad";
    } else {
      textSD = "Good";
    }
    if (backgroundcolorFW === "red") {
      textFW = "Bad";
    } else {
      textFW = "Good";
    }
    if (backgroundcolorSA === "red") {
      textSA = "Bad";
    } else {
      textSA = "Good";
    }
    return (
      <div className="PoseNet">
        {loading}
        <video id="posenetVideo" playsInline ref={this.getVideo} />
        <canvas id="posenetCanvas" ref={this.getCanvas} />
        <div className="videocueinfo">
          <div id="video-info-SD">Squat Depth:</div>
          <div id="SD-good" style={{ backgroundColor: backgroundcolorSD }}>
            {textSD}
          </div>
          <div id="video-info-SA">Shoulder Alignment:</div>
          <div id="SA-good" style={{ backgroundColor: backgroundcolorSA }}>
            {textSA}
          </div>
          <div id="video-info-FW">Feet Width:</div>
          <div id="FW-good" style={{ backgroundColor: backgroundcolorFW }}>
            {textFW}
          </div>
        </div>
      </div>
    );
  }
}
