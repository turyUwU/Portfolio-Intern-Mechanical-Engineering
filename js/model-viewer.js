(function () {
  'use strict';

  const modelModal = document.getElementById('modelModal');
  const modelModalClose = document.getElementById('modelModalClose');
  const projectModelCanvas = document.getElementById('projectModelCanvas');
  const modelTriggers = document.querySelectorAll('[data-model-key]');
  const embeddedModels = window.__PROJECT_MODELS || {};

  let renderer = null;
  let scene = null;
  let camera = null;
  let controls = null;
  let activeModel = null;
  let frameId = null;

  const statusMarkup = (message, color) =>
    `<div style="display:flex;height:100%;align-items:center;justify-content:center;color:${color};font:500 14px Inter, sans-serif;text-align:center;padding:24px;">${message}</div>`;

  const showStatus = (message, color = '#475569') => {
    if (!projectModelCanvas) return;
    projectModelCanvas.innerHTML = statusMarkup(message, color);
  };

  const getViewerSize = () => {
    if (!projectModelCanvas) {
      return { width: 960, height: 640 };
    }

    const rect = projectModelCanvas.getBoundingClientRect();

    return {
      width: Math.max(Math.round(rect.width || projectModelCanvas.clientWidth || 960), 1),
      height: Math.max(Math.round(rect.height || projectModelCanvas.clientHeight || 640), 1)
    };
  };

  const decodeBase64ToArrayBuffer = (base64) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  };

  const stopLoop = () => {
    if (!frameId) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  };

  const clearModel = () => {
    if (!activeModel || !scene) return;

    scene.remove(activeModel);

    if (activeModel.geometry) {
      activeModel.geometry.dispose();
    }

    if (activeModel.material) {
      if (Array.isArray(activeModel.material)) {
        activeModel.material.forEach((material) => material.dispose());
      } else {
        activeModel.material.dispose();
      }
    }

    activeModel = null;
  };

  const ensureLibraries = () => {
    return Boolean(
      window.THREE &&
      typeof window.THREE.WebGLRenderer === 'function' &&
      typeof window.THREE.OrbitControls === 'function' &&
      typeof window.THREE.STLLoader === 'function'
    );
  };

  const ensureViewer = () => {
    if (!projectModelCanvas || renderer || !ensureLibraries()) return;

    const { width, height } = getViewerSize();
    const THREE = window.THREE;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8dee8);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.15;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const hemisphereLight = new THREE.HemisphereLight(0xf8fafc, 0x94a3b8, 0.85);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(220, 260, 220);
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.45);
    rimLight.position.set(-180, 110, -180);

    scene.add(ambientLight, hemisphereLight, keyLight, rimLight);
  };

  const resizeViewer = () => {
    if (!renderer || !camera) return;

    const { width, height } = getViewerSize();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  const showViewerCanvas = () => {
    if (!projectModelCanvas || !renderer) return;
    projectModelCanvas.innerHTML = '';
    projectModelCanvas.appendChild(renderer.domElement);
  };

  const animate = () => {
    if (!renderer || !scene || !camera || !controls) return;
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  };

  const setModalState = (isOpen) => {
    if (!modelModal) return;

    modelModal.classList.toggle('active', isOpen);
    modelModal.setAttribute('aria-hidden', String(!isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  const processGeometry = (geometry) => {
    const THREE = window.THREE;
    if (!geometry || !geometry.attributes || !geometry.attributes.position || geometry.attributes.position.count === 0) {
      showStatus('This 3D file is empty or contains no visible mesh data.', '#b91c1c');
      return;
    }

    geometry.computeVertexNormals();
    geometry.center();
    geometry.computeBoundingBox();

    const material = new THREE.MeshPhongMaterial({
      color: 0x6b7280,
      specular: 0x1f2937,
      shininess: 14,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const fitDistance = Math.max(maxDim * 2.7, 280);

    scene.add(mesh);
    activeModel = mesh;

    camera.position.set(center.x + fitDistance, center.y + fitDistance * 0.42, center.z + fitDistance * 1.05);
    camera.near = Math.max(maxDim / 200, 0.1);
    camera.far = maxDim * 45;
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.minDistance = Math.max(maxDim * 0.3, 28);
    controls.maxDistance = Math.max(maxDim * 18, fitDistance * 4);
    controls.update();

    showViewerCanvas();
    renderer.render(scene, camera);
    stopLoop();
    animate();
  };

  const loadProjectModel = (trigger) => {
    if (!trigger || !ensureLibraries()) {
      showStatus('3D viewer libraries failed to load.', '#b91c1c');
      return;
    }

    const THREE = window.THREE;
    const modelKey = trigger.dataset.modelKey || '';
    const embeddedModel = embeddedModels[modelKey];
    const loader = new THREE.STLLoader();


    if (embeddedModel) {
      try {
        const geometry = loader.parse(decodeBase64ToArrayBuffer(embeddedModel));
        processGeometry(geometry);
      } catch (error) {
        showStatus('Unable to parse this embedded 3D model.', '#b91c1c');
      }
    } else if (modelKey.toLowerCase().endsWith('.stl')) {
      loader.load(
        modelKey,
        (geometry) => processGeometry(geometry),
        (xhr) => {
          if (xhr.lengthComputable) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            showStatus(`Loading 3D model: ${percent}%...`);
          }
        },
        (error) => {
          showStatus('Unable to load the 3D model file.', '#b91c1c');
        }
      );
    } else {
      showStatus('3D model data is missing or invalid.', '#b91c1c');
    }
  };

  const openModelModal = (trigger) => {
    if (!modelModal || !projectModelCanvas) return;

    if (!ensureLibraries()) {
      setModalState(true);
      showStatus('3D viewer library did not load. Refresh the page and try again.', '#b91c1c');
      return;
    }

    setModalState(true);
    showStatus('Loading 3D model...');

    requestAnimationFrame(() => {
      ensureViewer();
      resizeViewer();
      clearModel();
      loadProjectModel(trigger);

      requestAnimationFrame(() => {
        resizeViewer();
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      });
    });
  };

  const closeModelModal = () => {
    stopLoop();
    clearModel();
    setModalState(false);
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
    if (event.key === 'Escape' && modelModal && modelModal.classList.contains('active')) {
      closeModelModal();
    }
  });
})();
