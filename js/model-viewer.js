import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/controls/OrbitControls.js';
import { STLLoader } from './vendor/three/loaders/STLLoader.js';

const modelModal = document.getElementById('modelModal');
const modelModalClose = document.getElementById('modelModalClose');
const projectModelCanvas = document.getElementById('projectModelCanvas');
const modelTriggers = document.querySelectorAll('.card__model-btn');
const embeddedModels = window.__PROJECT_MODELS || {};

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let activeModel = null;
let frameId = null;

const statusMarkup = (message, color = '#475569') =>
  `<div style="display:flex;height:100%;align-items:center;justify-content:center;color:${color};font:500 14px Inter, sans-serif;text-align:center;padding:24px;">${message}</div>`;

const decodeBase64ToArrayBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const stopLoop = () => {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
};

const clearModel = () => {
  if (!activeModel || !scene) return;
  scene.remove(activeModel);
  activeModel.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (!child.material) return;
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
      return;
    }
    child.material.dispose();
  });
  activeModel = null;
};

const ensureViewer = () => {
  if (!projectModelCanvas || renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);

  camera = new THREE.PerspectiveCamera(
    45,
    projectModelCanvas.clientWidth / Math.max(projectModelCanvas.clientHeight, 1),
    0.1,
    5000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(projectModelCanvas.clientWidth, projectModelCanvas.clientHeight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.minDistance = 20;
  controls.maxDistance = 2000;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(180, 220, 160);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
  fillLight.position.set(-160, 120, -140);
  scene.add(ambientLight, keyLight, fillLight);
};

const resizeViewer = () => {
  if (!projectModelCanvas || !renderer || !camera) return;
  const width = projectModelCanvas.clientWidth;
  const height = Math.max(projectModelCanvas.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const animate = () => {
  if (!renderer || !scene || !camera || !controls) return;
  controls.update();
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
};

const showViewerCanvas = () => {
  if (!projectModelCanvas || !renderer) return;
  projectModelCanvas.innerHTML = '';
  projectModelCanvas.appendChild(renderer.domElement);
};

const openModelModal = (trigger) => {
  if (!modelModal || !projectModelCanvas || !trigger) return;

  ensureViewer();
  resizeViewer();
  clearModel();

  const modelKey = trigger.dataset.modelKey || '';
  const embeddedModel = embeddedModels[modelKey];

  if (!embeddedModel) {
    projectModelCanvas.innerHTML = statusMarkup('3D model data is missing.', '#b91c1c');
  } else {
    try {
      const loader = new STLLoader();
      const geometry = loader.parse(decodeBase64ToArrayBuffer(embeddedModel));

      if (!geometry?.attributes?.position || geometry.attributes.position.count === 0) {
        projectModelCanvas.innerHTML = statusMarkup('This 3D file is empty or contains no visible mesh data.', '#b91c1c');
      } else {
        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.18,
          roughness: 0.45
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitDistance = maxDim * 1.8;

        scene.add(mesh);
        activeModel = mesh;
        camera.position.set(fitDistance, fitDistance * 0.55, fitDistance);
        camera.near = Math.max(maxDim / 100, 0.1);
        camera.far = maxDim * 20;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.minDistance = maxDim * 0.6;
        controls.maxDistance = maxDim * 8;
        controls.update();

        showViewerCanvas();
        stopLoop();
        animate();
      }
    } catch (error) {
      projectModelCanvas.innerHTML = statusMarkup('Unable to parse this embedded 3D model.', '#b91c1c');
    }
  }

  modelModal.classList.add('active');
  modelModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeModelModal = () => {
  if (!modelModal) return;
  modelModal.classList.remove('active');
  modelModal.setAttribute('aria-hidden', 'true');
  stopLoop();
  clearModel();
  document.body.style.overflow = '';
};

modelTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => openModelModal(trigger));
});

if (modelModal) {
  modelModal.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-model-close="true"]')) {
      closeModelModal();
    }
  });
}

if (modelModalClose) {
  modelModalClose.addEventListener('click', closeModelModal);
}

window.addEventListener('resize', resizeViewer);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modelModal?.classList.contains('active')) {
    closeModelModal();
  }
});
