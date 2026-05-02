/* ============================================================
   camera.js — ID photo capture, local download only (no cloud)
   ============================================================ */

let _videoStream = null;

/**
 * Open the camera modal, let the employee capture the member's ID,
 * and trigger a local download of the image.
 *
 * @param {string} memberName
 * @param {string} idNumber
 * @returns {Promise<'captured'|'file'|'skipped'>}
 */
function initCamera(memberName, idNumber) {
  return new Promise(resolve => {
    const modal      = document.getElementById('cameraModal');
    const video      = document.getElementById('cameraVideo');
    const canvas     = document.getElementById('cameraCanvas');
    const preview    = document.getElementById('capturePreview');
    const statusEl   = document.getElementById('cameraStatus');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn  = document.getElementById('retakeBtn');
    const saveBtn    = document.getElementById('saveBtn');
    const skipBtn    = document.getElementById('skipCameraBtn');
    const fileWrap   = document.getElementById('fileInputContainer');
    const fileInput  = document.getElementById('fileCapture');

    /* Reset state */
    video.hidden    = true;
    preview.hidden  = true;
    captureBtn.hidden = true;
    retakeBtn.hidden  = true;
    saveBtn.hidden    = true;
    fileWrap.hidden   = true;
    statusEl.textContent = 'Starting camera…';
    modal.hidden = false;

    /* ----- attempt getUserMedia (live camera) ----- */
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        _videoStream = stream;
        video.srcObject = stream;
        video.hidden = false;
        captureBtn.hidden = false;
        statusEl.textContent = 'Position the ID card in frame, then tap Capture.';
      })
      .catch(() => {
        /* Fallback: file / camera-roll input */
        statusEl.textContent = 'Camera unavailable — choose a photo from your device instead.';
        fileWrap.hidden = false;
      });

    /* ----- Capture snapshot from live video ----- */
    captureBtn.onclick = () => {
      canvas.width  = video.videoWidth  || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0);

      preview.src  = canvas.toDataURL('image/jpeg', 0.92);
      video.hidden    = true;
      preview.hidden  = false;
      captureBtn.hidden = true;
      retakeBtn.hidden  = false;
      saveBtn.hidden    = false;
      statusEl.textContent = 'ID captured — save or retake.';
    };

    /* ----- Retake ----- */
    retakeBtn.onclick = () => {
      preview.hidden  = true;
      video.hidden    = false;
      captureBtn.hidden = false;
      retakeBtn.hidden  = true;
      saveBtn.hidden    = true;
      statusEl.textContent = 'Position the ID card in frame, then tap Capture.';
    };

    /* ----- Save & download from canvas capture ----- */
    saveBtn.onclick = () => {
      canvas.toBlob(blob => {
        _triggerDownload(blob, memberName, idNumber, 'jpg');
        _closeCamera();
        resolve('captured');
      }, 'image/jpeg', 0.92);
    };

    /* ----- File input fallback ----- */
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (!file) return;

      /* Re-download the file with a standardised filename */
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      _triggerDownload(file, memberName, idNumber, ext);
      _closeCamera();
      resolve('file');
    };

    /* ----- Skip ----- */
    skipBtn.onclick = () => {
      _closeCamera();
      resolve('skipped');
    };
  });
}

/* ---- helpers ---- */

function _safeFilename(str) {
  return (str || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
}

function _triggerDownload(blobOrFile, memberName, idNumber, ext) {
  const name = `${_safeFilename(memberName)}_${_safeFilename(idNumber)}_ID.${ext}`;
  const url  = URL.createObjectURL(blobOrFile);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  /* Revoke after a short delay so the download can start */
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function _closeCamera() {
  if (_videoStream) {
    _videoStream.getTracks().forEach(t => t.stop());
    _videoStream = null;
  }
  const video = document.getElementById('cameraVideo');
  if (video) video.srcObject = null;
  document.getElementById('cameraModal').hidden = true;
  /* Reset file input so the same file can be re-selected if needed */
  const fi = document.getElementById('fileCapture');
  if (fi) fi.value = '';
}
