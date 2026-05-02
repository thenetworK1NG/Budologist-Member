/* ============================================================
   camera.js — ID photo capture + local IndexedDB storage
   NO cloud / third-party storage — everything stays on device
   ============================================================ */

let _videoStream = null;

/* ─── IndexedDB image store (100% local, no network) ────────── */
const _IDB_NAME  = 'budologist-images';
const _IDB_STORE = 'id-photos';

function _openImgDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(_IDB_STORE, { keyPath: 'memberNumber' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/**
 * Save a base64 data URL image keyed by member number into IndexedDB.
 * Completely local — no network request.
 */
async function saveIdImageLocally(memberNumber, dataUrl) {
  try {
    const db = await _openImgDB();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readwrite');
      const req = tx.objectStore(_IDB_STORE).put({
        memberNumber, dataUrl,
        savedAt: new Date().toISOString()
      });
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch (e) {
    console.warn('Could not save image to local IndexedDB:', e);
  }
}

/**
 * Retrieve a stored ID photo data URL from IndexedDB.
 * Returns null if not found.
 */
async function getIdImageLocally(memberNumber) {
  try {
    const db = await _openImgDB();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readonly');
      const req = tx.objectStore(_IDB_STORE).get(memberNumber);
      req.onsuccess = e => resolve(e.target.result?.dataUrl || null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Open the camera modal, capture the member's ID,
 * save to local IndexedDB AND download to device.
 *
 * @param {string} memberName
 * @param {string} idNumber
 * @param {string} memberNumber  — IndexedDB key
 * @returns {Promise<'captured'|'file'|'skipped'>}
 */
function initCamera(memberName, idNumber, memberNumber) {
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

    /* ----- Save: store in IndexedDB + download to device ----- */
    saveBtn.onclick = () => {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      /* 1 — Persist in local IndexedDB (viewable later in member detail) */
      saveIdImageLocally(memberNumber, dataUrl);
      /* 2 — Also download as file to device storage */
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

      /* Save to IndexedDB via FileReader */
      const reader = new FileReader();
      reader.onload = e => saveIdImageLocally(memberNumber, e.target.result);
      reader.readAsDataURL(file);

      /* Download with standardised filename */
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      _triggerDownload(file, memberName, idNumber, ext);
      _closeCamera();
      resolve('file');
    ;}

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
