// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Removed problematic TransformControls import
// import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';


// === BASE SCENE ===
const scene = new THREE.Scene();
// Black background like before
// scene.background = new THREE.Color(0xf0f0f0);

// CAMERA AND RENDERER
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 3, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

console.log('Renderer created and added to DOM');

// CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// LIGHTS
scene.add(new THREE.AmbientLight(0xffffff, 2.0)); // Increased ambient light for better GLB visibility
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(4, 7, 2);
dirLight.castShadow = true;
scene.add(dirLight);

// Additional soft directional light from opposite side for better GLB illumination
const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight2.position.set(-3, 5, -2);
scene.add(dirLight2);

// GRID in meters - white grid on black background
const mainGrid = new THREE.GridHelper(20, 20, 0xffffff, 0xffffff); // Main grid for meters
scene.add(mainGrid);

const subGrid = new THREE.GridHelper(20, 200, 0xaaaaaa, 0xaaaaaa); // Secondary grid for decimeters
subGrid.material.opacity = 0.5; // Make lines less prominent
subGrid.material.transparent = true;
scene.add(subGrid);

// AXES
const axes = new THREE.AxesHelper(2);
scene.add(axes);

console.log('Scene configured with lights, grid and axes');

// WINDOW ADJUSTMENT
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === CAMERA ARRAY ===
const cameraObjects = [];
let selectedCamera = null;

// === GLB MODELS ARRAY ===
const glbModels = [];
let selectedModel = null;

// === CURRENT SELECTION TYPE ===
let selectionType = null; // 'camera' or 'model'

// === GLTF LOADER ===
const gltfLoader = new GLTFLoader();

// === RAYCASTER FOR SELECTION ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isMouseDown = false;
let mouseDownPosition = new THREE.Vector2();

// === ADD CAMERA FUNCTION ===
function addCamera() {
    // Cone simulating a camera (pointing towards Z+)
    const geometry = new THREE.ConeGeometry(0.075, 0.2, 32); // Halved dimensions for the cone
    const material = new THREE.MeshStandardMaterial({ color: 0x2266dd });
    const camMesh = new THREE.Mesh(geometry, material);
    camMesh.position.set(Math.random() * 4 - 2, 0.2, Math.random() * 4 - 2); // Random position
    camMesh.rotation.x = -Math.PI / 2; // Adjust orientation to match frustum convention
    camMesh.castShadow = true;
    camMesh.userData.isCamera = true;
    camMesh.userData.originalColor = 0x2266dd;
    scene.add(camMesh);
    cameraObjects.push(camMesh);

    console.log('Camera created at position:', camMesh.position);

    // Automatically select the new camera
    selectCamera(camMesh);
}

// === GLB MODEL FUNCTIONS ===
function uploadGLBModel(file) {
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    
    gltfLoader.load(url, (gltf) => {
        const model = gltf.scene;
        
        // Set position to origin
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        model.rotation.set(0, 0, 0);
        
        // Enable shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Add metadata
        model.userData.isGLBModel = true;
        model.userData.fileName = file.name;
        model.userData.originalColor = null; // Will be set if needed
        
        scene.add(model);
        glbModels.push(model);
        
        console.log('GLB model loaded:', file.name);
        
        // Automatically select the new model
        selectModel(model);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
    }, 
    (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('Error loading GLB model:', error);
        URL.revokeObjectURL(url);
    });
}

// === CAMERA SELECTION ===
function selectCamera(camera) {
    console.log('selectCamera called with:', camera);
    
    // Deselect model if one was selected
    if (selectedModel) {
        selectModel(null);
    }
    
    // Deselect previous camera
    if (selectedCamera && selectedCamera.material) {
        selectedCamera.material.color.setHex(selectedCamera.userData.originalColor);
    }
    
    // Reset hover if necessary
    if (hoveredCamera && hoveredCamera !== camera) {
        hoveredCamera.material.color.setHex(hoveredCamera.userData.originalColor);
        hoveredCamera = null;
    }
    
    selectedCamera = camera;
    selectionType = camera ? 'camera' : null;
    
    if (camera) {
        // Highlight selected camera
        camera.material.color.setHex(0xff6b35);
        
        // Show camera controls
        const controlsDiv = document.getElementById('camera-controls');
        if (controlsDiv) {
            controlsDiv.style.display = 'block';
            console.log('Control panel shown');
        }
        
        // Hide model controls
        const modelControlsDiv = document.getElementById('model-controls');
        if (modelControlsDiv) {
            modelControlsDiv.style.display = 'none';
        }
        
        // Update form values
        updateFormValues();
        
        // Create custom gizmo
        createGizmo(camera);
        console.log('Gizmo activated');
    } else {
        // Hide controls
        const controlsDiv = document.getElementById('camera-controls');
        if (controlsDiv) {
            controlsDiv.style.display = 'none';
            console.log('Control panel hidden');
        }
        
        // Remove gizmo
        if (gizmoGroup) {
            scene.remove(gizmoGroup);
            gizmoGroup = null;
            console.log('Gizmo removed');
        }
    }
}

// === MODEL SELECTION ===
function selectModel(model) {
    console.log('selectModel called with:', model);
    
    // Deselect camera if one was selected
    if (selectedCamera) {
        selectCamera(null);
    }
    
    // Reset hover if necessary
    if (hoveredCamera) {
        hoveredCamera.material.color.setHex(hoveredCamera.userData.originalColor);
        hoveredCamera = null;
    }
    
    selectedModel = model;
    selectionType = 'model';
    
    if (model) {
        // Show model controls
        const modelControlsDiv = document.getElementById('model-controls');
        if (modelControlsDiv) {
            modelControlsDiv.style.display = 'block';
            console.log('Model control panel shown');
        }
        
        // Hide camera controls
        const cameraControlsDiv = document.getElementById('camera-controls');
        if (cameraControlsDiv) {
            cameraControlsDiv.style.display = 'none';
        }
        
        // Update form values
        updateModelFormValues();
        
        // Create custom gizmo
        createGizmo(model);
        console.log('Model gizmo activated');
    } else {
        // Hide model controls
        const modelControlsDiv = document.getElementById('model-controls');
        if (modelControlsDiv) {
            modelControlsDiv.style.display = 'none';
            console.log('Model control panel hidden');
        }
        
        selectionType = null;
        
        // Remove gizmo
        if (gizmoGroup) {
            scene.remove(gizmoGroup);
            gizmoGroup = null;
            console.log('Gizmo removed');
        }
    }
}

// === UPDATE FORM VALUES ===
function updateFormValues() {
    if (!selectedCamera) return;
    
    selectedCamera.updateMatrixWorld(true);
    const pos = selectedCamera.position;
    const quat = selectedCamera.quaternion;
    
    // Ensure values are numeric
    document.getElementById('posX').value = Number(pos.x).toFixed(3);
    document.getElementById('posY').value = Number(pos.y).toFixed(3);
    document.getElementById('posZ').value = Number(pos.z).toFixed(3);
    
    document.getElementById('quatW').value = Number(quat.w).toFixed(4);
    document.getElementById('quatX').value = Number(quat.x).toFixed(4);
    document.getElementById('quatY').value = Number(quat.y).toFixed(4);
    document.getElementById('quatZ').value = Number(quat.z).toFixed(4);
}

// === UPDATE MODEL FORM VALUES ===
function updateModelFormValues() {
    if (!selectedModel) return;
    
    selectedModel.updateMatrixWorld(true);
    const pos = selectedModel.position;
    const rot = selectedModel.rotation;
    const scale = selectedModel.scale;
    
    // Position
    document.getElementById('modelPosX').value = Number(pos.x).toFixed(3);
    document.getElementById('modelPosY').value = Number(pos.y).toFixed(3);
    document.getElementById('modelPosZ').value = Number(pos.z).toFixed(3);
    
    // Rotation (convert from radians to degrees)
    document.getElementById('modelRotX').value = Number(THREE.MathUtils.radToDeg(rot.x)).toFixed(1);
    document.getElementById('modelRotY').value = Number(THREE.MathUtils.radToDeg(rot.y)).toFixed(1);
    document.getElementById('modelRotZ').value = Number(THREE.MathUtils.radToDeg(rot.z)).toFixed(1);
    
    // Scale
    document.getElementById('modelScaleX').value = Number(scale.x).toFixed(2);
    document.getElementById('modelScaleY').value = Number(scale.y).toFixed(2);
    document.getElementById('modelScaleZ').value = Number(scale.z).toFixed(2);
}

// === APPLY VALUES FROM FORM ===
function applyFormValues() {
    if (!selectedCamera) return;
    
    const posX = parseFloat(document.getElementById('posX').value);
    const posY = parseFloat(document.getElementById('posY').value);
    const posZ = parseFloat(document.getElementById('posZ').value);
    
    const quatW = parseFloat(document.getElementById('quatW').value);
    const quatX = parseFloat(document.getElementById('quatX').value);
    const quatY = parseFloat(document.getElementById('quatY').value);
    const quatZ = parseFloat(document.getElementById('quatZ').value);
    
    if (!isNaN(posX) && !isNaN(posY) && !isNaN(posZ)) {
        selectedCamera.position.set(posX, posY, posZ);
        
        // Update gizmo position if present
        if (gizmoGroup) {
            gizmoGroup.position.copy(selectedCamera.position);
        }
    }
    
    if (!isNaN(quatW) && !isNaN(quatX) && !isNaN(quatY) && !isNaN(quatZ)) {
        selectedCamera.quaternion.set(quatX, quatY, quatZ, quatW);
    }
}

// === APPLY MODEL VALUES FROM FORM ===
function applyModelFormValues() {
    if (!selectedModel) return;
    
    const posX = parseFloat(document.getElementById('modelPosX').value);
    const posY = parseFloat(document.getElementById('modelPosY').value);
    const posZ = parseFloat(document.getElementById('modelPosZ').value);
    
    const rotX = parseFloat(document.getElementById('modelRotX').value);
    const rotY = parseFloat(document.getElementById('modelRotY').value);
    const rotZ = parseFloat(document.getElementById('modelRotZ').value);
    
    const scaleX = parseFloat(document.getElementById('modelScaleX').value);
    const scaleY = parseFloat(document.getElementById('modelScaleY').value);
    const scaleZ = parseFloat(document.getElementById('modelScaleZ').value);
    
    if (!isNaN(posX) && !isNaN(posY) && !isNaN(posZ)) {
        selectedModel.position.set(posX, posY, posZ);
        
        // Update gizmo position if present
        if (gizmoGroup) {
            gizmoGroup.position.copy(selectedModel.position);
        }
    }
    
    if (!isNaN(rotX) && !isNaN(rotY) && !isNaN(rotZ)) {
        // Convert from degrees to radians
        selectedModel.rotation.set(
            THREE.MathUtils.degToRad(rotX),
            THREE.MathUtils.degToRad(rotY),
            THREE.MathUtils.degToRad(rotZ)
        );
    }
    
    if (!isNaN(scaleX) && !isNaN(scaleY) && !isNaN(scaleZ)) {
        selectedModel.scale.set(scaleX, scaleY, scaleZ);
    }
}

// === DELETE SELECTED CAMERA ===
function deleteSelectedCamera() {
    if (!selectedCamera) return;
    
    const index = cameraObjects.indexOf(selectedCamera);
    if (index > -1) {
        scene.remove(selectedCamera);
        cameraObjects.splice(index, 1);
        
        // Remove controls
        selectCamera(null);
        
        // Select another camera if available
        if (cameraObjects.length > 0) {
            selectCamera(cameraObjects[cameraObjects.length - 1]);
        }
    }
}

// === DELETE SELECTED MODEL ===
function deleteSelectedModel() {
    if (!selectedModel) return;
    
    const index = glbModels.indexOf(selectedModel);
    if (index > -1) {
        scene.remove(selectedModel);
        glbModels.splice(index, 1);
        
        // Remove controls
        selectModel(null);
        
        // Select another model if available
        if (glbModels.length > 0) {
            selectModel(glbModels[glbModels.length - 1]);
        }
    }
}

// === CUSTOM GIZMO ===
let gizmoGroup = null;
let isDragging = false;
let dragAxis = null;
let dragStart = new THREE.Vector3();
let cameraStart = new THREE.Vector3();
let rotationStart = new THREE.Euler();
let gizmoMode = 'translate'; // 'translate', 'rotate', or 'scale'

function createGizmo(targetObject) {
    // Remove previous gizmo
    if (gizmoGroup) {
        scene.remove(gizmoGroup);
        gizmoGroup = null;
    }

    if (!targetObject) return;

    gizmoGroup = new THREE.Group();
    gizmoGroup.userData.isGizmo = true;

    // Position the gizmo on the target object
    gizmoGroup.position.copy(targetObject.position);

    if (gizmoMode === 'translate') {
        createTranslationGizmo();
    } else if (gizmoMode === 'rotate') {
        createRotationGizmo();
    } else if (gizmoMode === 'scale') {
        createScaleGizmo();
    }

    scene.add(gizmoGroup);
    console.log('Custom gizmo created in mode:', gizmoMode);
}

function createTranslationGizmo() {
    // Create arrows for X, Y, Z axes
    const arrowLength = 0.8; // Restore original length for translation gizmos
    const arrowColors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue
    const axisNames = ['x', 'y', 'z'];

    for (let i = 0; i < 3; i++) {
        // Arrow body (cylinder)
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, arrowLength, 8); // Reduce thickness
        const material = new THREE.MeshBasicMaterial({ color: arrowColors[i] });
        const arrow = new THREE.Mesh(geometry, material);
        
        // Arrow tip (cone)
        const tipGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
        const tipMaterial = new THREE.MeshBasicMaterial({ color: arrowColors[i] });
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        
        // Position the arrow
        if (i === 0) { // X
            arrow.rotation.z = -Math.PI / 2;
            tip.rotation.z = -Math.PI / 2;
            tip.position.x = arrowLength / 2 + 0.075;
        } else if (i === 1) { // Y
            tip.position.y = arrowLength / 2 + 0.075;
        } else { // Z
            arrow.rotation.x = Math.PI / 2;
            tip.rotation.x = Math.PI / 2;
            tip.position.z = arrowLength / 2 + 0.075;
        }

        arrow.userData.axis = axisNames[i];
        arrow.userData.mode = 'translate';
        tip.userData.axis = axisNames[i];
        tip.userData.mode = 'translate';

        gizmoGroup.add(arrow);
        gizmoGroup.add(tip);
    }
}

function createRotationGizmo() {
    // Create rings for rotation on X, Y, Z axes
    const radius = 0.3; // Halved radius for rotation gizmos
    const arrowColors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue
    const axisNames = ['x', 'y', 'z'];

    for (let i = 0; i < 3; i++) {
        // Create a torus (ring) for each axis
        const geometry = new THREE.TorusGeometry(radius, 0.02, 8, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: arrowColors[i],
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(geometry, material);
        
        // Orient the ring for each axis
        if (i === 0) { // X
            ring.rotation.y = Math.PI / 2;
        } else if (i === 1) { // Y
            // Remains horizontal
        } else { // Z
            ring.rotation.x = Math.PI / 2;
        }

        ring.userData.axis = axisNames[i];
        ring.userData.mode = 'rotate';

        gizmoGroup.add(ring);
    }
}

function createScaleGizmo() {
    // Create cubes for scale on X, Y, Z axes
    const handleSize = 0.08;
    const arrowColors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue
    const axisNames = ['x', 'y', 'z'];

    for (let i = 0; i < 3; i++) {
        // Scale handle (cube)
        const geometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize);
        const material = new THREE.MeshBasicMaterial({ color: arrowColors[i] });
        const handle = new THREE.Mesh(geometry, material);
        
        // Line to center
        const lineGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: arrowColors[i] });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        
        // Position the handle and line
        if (i === 0) { // X
            handle.position.x = 0.4;
            line.rotation.z = -Math.PI / 2;
        } else if (i === 1) { // Y
            handle.position.y = 0.4;
        } else { // Z
            handle.position.z = 0.4;
            line.rotation.x = Math.PI / 2;
        }

        handle.userData.axis = axisNames[i];
        handle.userData.mode = 'scale';
        line.userData.axis = axisNames[i];
        line.userData.mode = 'scale';

        gizmoGroup.add(handle);
        gizmoGroup.add(line);
    }
}

// === GIZMO DRAG HANDLING ===
function handleGizmoDrag(event) {
    const targetObject = selectedCamera || selectedModel;
    if (!isDragging || !dragAxis || !targetObject) return;

    // Calculate normalized mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (gizmoMode === 'translate') {
        handleTranslationDrag();
    } else if (gizmoMode === 'rotate') {
        handleRotationDrag(event);
    } else if (gizmoMode === 'scale') {
        handleScaleDrag(event);
    }
}

function handleTranslationDrag() {
    // Create a plane for dragging
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const plane = new THREE.Plane();
    const targetObject = selectedCamera || selectedModel;
    plane.setFromNormalAndCoplanarPoint(direction, targetObject.position);

    // Raycasting to find intersection with the plane
    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
        const delta = intersection.sub(dragStart);
        const newPosition = cameraStart.clone();

        // Apply movement only on the selected axis
        switch(dragAxis) {
            case 'x':
                newPosition.x += delta.x;
                break;
            case 'y':
                newPosition.y += delta.y;
                break;
            case 'z':
                newPosition.z += delta.z;
                break;
        }

        targetObject.position.copy(newPosition);
        
        // Update gizmo position
        if (gizmoGroup) {
            gizmoGroup.position.copy(targetObject.position);
        }
        
        // Update form values
        if (selectedCamera) {
            updateFormValues();
        } else if (selectedModel) {
            updateModelFormValues();
        }
    }
}

function handleRotationDrag(event) {
    // Calculate mouse delta from initial click
    const deltaX = event.clientX - mouseDownPosition.x;
    const deltaY = event.clientY - mouseDownPosition.y;
    
    // Rotation sensitivity
    const sensitivity = 0.01;
    
    let deltaRotation = deltaX * sensitivity;
    
    // Copy initial rotation
    const newRotation = rotationStart.clone();
    
    // Apply rotation only on the selected axis
    switch(dragAxis) {
        case 'x':
            newRotation.x += deltaRotation;
            break;
        case 'y':
            newRotation.y += deltaRotation;
            break;
        case 'z':
            newRotation.z += deltaRotation;
            break;
    }
    
    const targetObject = selectedCamera || selectedModel;
    targetObject.rotation.copy(newRotation);
    
    // Update form values
    if (selectedCamera) {
        updateFormValues();
    } else if (selectedModel) {
        updateModelFormValues();
    }
}

function handleScaleDrag(event) {
    // Only models can be scaled
    if (!selectedModel) return;
    
    // Calculate mouse delta from initial click
    const deltaX = event.clientX - mouseDownPosition.x;
    const deltaY = event.clientY - mouseDownPosition.y;
    
    // Scale sensitivity
    const sensitivity = 0.005;
    let deltaScale = deltaX * sensitivity;
    
    // Get initial scale (stored when drag started)
    const initialScale = selectedModel.userData.initialScale;
    if (!initialScale) return; // Safety check
    
    const newScale = initialScale.clone();
    
    // Apply scale change only on the selected axis
    switch(dragAxis) {
        case 'x':
            newScale.x = Math.max(0.1, initialScale.x + deltaScale);
            break;
        case 'y':
            newScale.y = Math.max(0.1, initialScale.y + deltaScale);
            break;
        case 'z':
            newScale.z = Math.max(0.1, initialScale.z + deltaScale);
            break;
    }
    
    selectedModel.scale.copy(newScale);
    
    // Update form values
    updateModelFormValues();
}
function onMouseDown(event) {
    isMouseDown = true;
    mouseDownPosition.set(event.clientX, event.clientY);
    
    // Check if clicking on a gizmo
    if (gizmoGroup) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const gizmoIntersects = raycaster.intersectObjects(gizmoGroup.children, true);
        
        if (gizmoIntersects.length > 0) {
            const clickedPart = gizmoIntersects[0].object;
            if (clickedPart.userData.axis) {
                isDragging = true;
                dragAxis = clickedPart.userData.axis;
                controls.enabled = false; // Disable orbit controls
                
                const targetObject = selectedCamera || selectedModel;
                
                // Save initial positions/rotations/scales
                cameraStart.copy(targetObject.position);
                rotationStart.copy(targetObject.rotation);
                
                if (gizmoMode === 'scale' && selectedModel) {
                    selectedModel.userData.initialScale = selectedModel.scale.clone();
                }
                
                if (gizmoMode === 'translate') {
                    // Calculate starting point for dragging
                    const direction = new THREE.Vector3();
                    camera.getWorldDirection(direction);
                    const plane = new THREE.Plane();
                    plane.setFromNormalAndCoplanarPoint(direction, targetObject.position);
                    raycaster.ray.intersectPlane(plane, dragStart);
                }
                
                console.log('Started dragging on axis:', dragAxis, 'mode:', gizmoMode);
                return;
            }
        }
    }
}

function onMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        dragAxis = null;
        controls.enabled = true; // Re-enable orbit controls
        console.log('Drag ended');
        return;
    }
    
    if (!isMouseDown) return;
    isMouseDown = false;
    
    // Check if it was a click (minimal movement) or a drag
    const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
    const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
    const isClick = deltaX < 5 && deltaY < 5; // 5 pixel tolerance
    
    if (isClick) {
        handleCameraSelection(event);
    }
}

function handleCameraSelection(event) {
    // Calculate normalized mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Check intersections with GLB models first (they might be larger)
    const modelIntersects = raycaster.intersectObjects(glbModels, true);
    if (modelIntersects.length > 0) {
        const clickedModel = modelIntersects[0].object;
        // Find the root model object
        let rootModel = clickedModel;
        while (rootModel.parent && !rootModel.userData.isGLBModel) {
            rootModel = rootModel.parent;
        }
        if (rootModel.userData.isGLBModel) {
            selectModel(rootModel);
            console.log('GLB Model selected!');
            return;
        }
    }

    // Check intersections with cameras
    const cameraIntersects = raycaster.intersectObjects(cameraObjects);
    if (cameraIntersects.length > 0) {
        const clickedCamera = cameraIntersects[0].object;
        if (clickedCamera.userData.isCamera) {
            selectCamera(clickedCamera);
            console.log('Camera selected!');
            return;
        }
    }
    
    // Clicked on empty space - deselect
    selectCamera(null);
    selectModel(null);
    console.log('Selection removed');
}

// Add mouse event listeners
renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mouseup', onMouseUp);
renderer.domElement.addEventListener('mousemove', onMouseMove);

// === MOUSE MOVE HANDLING ===
function onMouseMove(event) {
    if (isDragging) {
        handleGizmoDrag(event);
        return;
    }
    
    // Normal hover handling only if not dragging
    handleHover(event);
}

// === HOVER HANDLING FOR VISUAL FEEDBACK ===
let hoveredCamera = null;

function handleHover(event) {
    // Do not hover if dragging
    if (isDragging) return;
    
    // Calculate normalized mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Check intersections with cameras
    const intersects = raycaster.intersectObjects(cameraObjects);

    // Reset previous hover
    if (hoveredCamera && hoveredCamera !== selectedCamera) {
        hoveredCamera.material.color.setHex(hoveredCamera.userData.originalColor);
        renderer.domElement.style.cursor = 'default';
    }

    if (intersects.length > 0) {
        const camera = intersects[0].object;
        if (camera.userData.isCamera && camera !== selectedCamera) {
            hoveredCamera = camera;
            camera.material.color.setHex(0x66aaff); // Hover color
            renderer.domElement.style.cursor = 'pointer';
        } else {
            hoveredCamera = null;
            renderer.domElement.style.cursor = 'default';
        }
    } else {
        // Check if hovering over a gizmo
        if (gizmoGroup) {
            const gizmoIntersects = raycaster.intersectObjects(gizmoGroup.children, true);
            if (gizmoIntersects.length > 0) {
                renderer.domElement.style.cursor = 'move';
            } else {
                renderer.domElement.style.cursor = 'default';
            }
        } else {
            hoveredCamera = null;
            renderer.domElement.style.cursor = 'default';
        }
    }
}

// === KEYBOARD HANDLING ===
function handleKeyPress(event) {
    const targetObject = selectedCamera || selectedModel;
    
    // Close info popup with ESC key
    if (event.key === 'Escape') {
        const infoPopup = document.getElementById('info-popup');
        if (infoPopup && infoPopup.style.display === 'flex') {
            infoPopup.style.display = 'none';
            return;
        }
    }
    
    if (!targetObject) return;
    
    switch(event.key.toLowerCase()) {
        case 't':
            setGizmoMode('translate');
            break;
        case 'r':
            setGizmoMode('rotate');
            break;
        case 's':
            // Scale mode only for models
            if (selectedModel) {
                setGizmoMode('scale');
            }
            break;
    }
}

function setGizmoMode(mode) {
    const targetObject = selectedCamera || selectedModel;
    if (!targetObject) return;
    
    // Scale mode only for models
    if (mode === 'scale' && !selectedModel) {
        console.log('Scale mode is only available for GLB models');
        return;
    }
    
    gizmoMode = mode;
    console.log('Mode changed to:', mode);
    
    // Recreate gizmo in new mode
    createGizmo(targetObject);
}

window.addEventListener('keydown', handleKeyPress);

// === EXPORT RIG_CONFIG.JSON ===
function exportCameras() {
    if (cameraObjects.length === 0) {
        console.warn('No cameras to export');
        return;
    }

    // Get reference camera (first one) position and rotation
    const refCamera = cameraObjects[0];
    refCamera.updateMatrixWorld(true);
    const refPos = new THREE.Vector3();
    const refQuat = new THREE.Quaternion();
    refCamera.getWorldPosition(refPos);
    refCamera.getWorldQuaternion(refQuat);
    
    const cameraData = cameraObjects.map((cam, idx) => {
        if (idx === 0) {
            // First camera is the reference sensor
            return {
                image_prefix: `cam${idx}/images/`,
                ref_sensor: true
            };
        } else {
            // Other cameras are relative to the reference
            cam.updateMatrixWorld(true);
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            cam.getWorldPosition(pos);
            cam.getWorldQuaternion(quat);
            
            // Calculate relative position (cam position - ref position)
            const relativePos = pos.clone().sub(refPos);
            
            // Calculate relative rotation (inverse of ref rotation * cam rotation)
            const refQuatInverse = refQuat.clone().invert();
            const relativeQuat = refQuatInverse.multiply(quat);
            
            return {
                image_prefix: `cam${idx}/images/`,
                cam_from_rig_translation: [
                    Number(relativePos.x.toFixed(5)), 
                    Number(relativePos.y.toFixed(5)), 
                    Number(relativePos.z.toFixed(5))
                ],
                cam_from_rig_rotation: [
                    Number(relativeQuat.w.toFixed(7)), 
                    Number(relativeQuat.x.toFixed(7)), 
                    Number(relativeQuat.y.toFixed(7)), 
                    Number(relativeQuat.z.toFixed(7))
                ]
            };
        }
    });
    
    const rigConfig = {
        rigs: [{
            cameras: cameraData
        }]
    };
    
    const blob = new Blob([JSON.stringify(rigConfig, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "rig_config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log('Exported', cameraData.length, 'cameras to rig_config.json');
}

// === IMPORT CAMERAS FROM JSON ===
function importCameras(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            
            // Validate JSON structure
            if (!jsonData.rigs || !Array.isArray(jsonData.rigs) || jsonData.rigs.length === 0) {
                throw new Error('Invalid rig_config.json format: missing or empty rigs array');
            }
            
            const rig = jsonData.rigs[0];
            if (!rig.cameras || !Array.isArray(rig.cameras)) {
                throw new Error('Invalid rig_config.json format: missing cameras array in first rig');
            }
            
            // Clear existing cameras
            clearAllCameras();
            
            // Find reference camera (the one with ref_sensor: true)
            let refCameraIndex = rig.cameras.findIndex(cam => cam.ref_sensor === true);
            if (refCameraIndex === -1) {
                // If no ref_sensor found, assume first camera is reference
                refCameraIndex = 0;
                console.warn('No ref_sensor found, assuming first camera is reference');
            }
            
            // Set reference camera at origin for simplicity
            const refPosition = new THREE.Vector3(0, 0.2, 0); // Default height
            const refQuaternion = new THREE.Quaternion(); // Identity quaternion
            
            // Import cameras
            rig.cameras.forEach((cameraData, index) => {
                try {
                    // Create camera mesh
                    const geometry = new THREE.ConeGeometry(0.075, 0.2, 32);
                    const material = new THREE.MeshStandardMaterial({ color: 0x2266dd });
                    const camMesh = new THREE.Mesh(geometry, material);
                    
                    if (index === refCameraIndex || cameraData.ref_sensor === true) {
                        // Reference camera at origin
                        camMesh.position.copy(refPosition);
                        camMesh.quaternion.copy(refQuaternion);
                        console.log(`Imported reference camera at origin`);
                    } else {
                        // Other cameras are relative to reference
                        if (!cameraData.cam_from_rig_translation || !Array.isArray(cameraData.cam_from_rig_translation) || cameraData.cam_from_rig_translation.length !== 3) {
                            console.warn(`Skipping camera ${index}: invalid cam_from_rig_translation`);
                            return;
                        }
                        
                        if (!cameraData.cam_from_rig_rotation || !Array.isArray(cameraData.cam_from_rig_rotation) || cameraData.cam_from_rig_rotation.length !== 4) {
                            console.warn(`Skipping camera ${index}: invalid cam_from_rig_rotation`);
                            return;
                        }
                        
                        // Get relative position and rotation
                        const [relX, relY, relZ] = cameraData.cam_from_rig_translation;
                        const [w, qx, qy, qz] = cameraData.cam_from_rig_rotation;
                        
                        // Apply relative transformation to reference position
                        const relativePos = new THREE.Vector3(relX, relY, relZ);
                        const finalPosition = refPosition.clone().add(relativePos);
                        
                        // Apply relative rotation to reference rotation
                        const relativeQuat = new THREE.Quaternion(qx, qy, qz, w);
                        const finalQuaternion = refQuaternion.clone().multiply(relativeQuat);
                        
                        camMesh.position.copy(finalPosition);
                        camMesh.quaternion.copy(finalQuaternion);
                        
                        console.log(`Imported camera ${index} at position (${finalPosition.x.toFixed(3)}, ${finalPosition.y.toFixed(3)}, ${finalPosition.z.toFixed(3)})`);
                    }
                    
                    // Apply the base rotation for camera orientation
                    camMesh.rotation.x += -Math.PI / 2;
                    
                    camMesh.castShadow = true;
                    camMesh.userData.isCamera = true;
                    camMesh.userData.originalColor = 0x2266dd;
                    camMesh.userData.cameraId = index;
                    camMesh.userData.isReference = (index === refCameraIndex || cameraData.ref_sensor === true);
                    
                    scene.add(camMesh);
                    cameraObjects.push(camMesh);
                    
                } catch (error) {
                    console.error(`Error importing camera ${index}:`, error);
                }
            });
            
            console.log(`Successfully imported ${cameraObjects.length} cameras from ${file.name}`);
            
            // Select the first camera if any were imported
            if (cameraObjects.length > 0) {
                selectCamera(cameraObjects[0]);
            }
            
        } catch (error) {
            console.error('Error parsing JSON file:', error);
            alert(`Error importing file: ${error.message}`);
        }
    };
    
    reader.onerror = () => {
        console.error('Error reading file');
        alert('Error reading file');
    };
    
    reader.readAsText(file);
}

// === CLEAR ALL CAMERAS ===
function clearAllCameras() {
    // Remove all cameras from scene
    cameraObjects.forEach(camera => {
        scene.remove(camera);
    });
    
    // Clear arrays
    cameraObjects.length = 0;
    
    // Deselect current selection
    selectCamera(null);
    
    console.log('Cleared all cameras from scene');
}

// === UI INITIALIZATION ===
function initializeUI() {
    console.log('Initializing UI...');
    
    // Main controls
    const addBtn = document.getElementById('addCameraBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const jsonInput = document.getElementById('jsonImport');
    const uploadBtn = document.getElementById('uploadGlbBtn');
    const glbInput = document.getElementById('glbUpload');
    
    if (addBtn) addBtn.textContent = 'Add Camera';
    if (exportBtn) exportBtn.textContent = 'Export Cameras';
    if (importBtn) importBtn.textContent = 'Import Cameras';
    if (uploadBtn) uploadBtn.textContent = 'Upload GLB Model';

    // Selected camera controls
    const translateBtn = document.getElementById('translateBtn');
    const rotateBtn = document.getElementById('rotateBtn');
    const scaleBtn = document.getElementById('scaleBtn');
    const applyBtn = document.getElementById('applyTransformBtn');
    const deleteBtn = document.getElementById('deleteCameraBtn');
    
    if (translateBtn) translateBtn.textContent = 'Translate';
    if (rotateBtn) rotateBtn.textContent = 'Rotate';
    if (scaleBtn) scaleBtn.textContent = 'Scale';
    if (applyBtn) applyBtn.textContent = 'Apply Transform';
    if (deleteBtn) deleteBtn.textContent = 'Delete Camera';

    // Selected model controls
    const modelTranslateBtn = document.getElementById('modelTranslateBtn');
    const modelRotateBtn = document.getElementById('modelRotateBtn');
    const modelScaleBtn = document.getElementById('modelScaleBtn');
    const applyModelBtn = document.getElementById('applyModelTransformBtn');
    const deleteModelBtn = document.getElementById('deleteModelBtn');
    
    if (modelTranslateBtn) modelTranslateBtn.textContent = 'Translate';
    if (modelRotateBtn) modelRotateBtn.textContent = 'Rotate';
    if (modelScaleBtn) modelScaleBtn.textContent = 'Scale';
    if (applyModelBtn) applyModelBtn.textContent = 'Apply Transform';
    if (deleteModelBtn) deleteModelBtn.textContent = 'Delete Model';

    // Input labels
    const labels = {
        posX: 'Position X',
        posY: 'Position Y',
        posZ: 'Position Z',
        quatW: 'Quaternion W',
        quatX: 'Quaternion X',
        quatY: 'Quaternion Y',
        quatZ: 'Quaternion Z'
    };

    Object.keys(labels).forEach(id => {
        const label = document.querySelector(`label[for=${id}]`);
        if (label) label.textContent = labels[id];
    });

    // Event handlers
    if (addBtn) addBtn.onclick = () => addCamera();
    if (exportBtn) exportBtn.onclick = () => exportCameras();
    if (importBtn) importBtn.onclick = () => jsonInput.click();
    if (jsonInput) jsonInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            importCameras(e.target.files[0]);
        }
    };
    if (uploadBtn) uploadBtn.onclick = () => glbInput.click();
    if (glbInput) glbInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            uploadGLBModel(e.target.files[0]);
        }
    };
    
    if (translateBtn) translateBtn.onclick = () => setGizmoMode('translate');
    if (rotateBtn) rotateBtn.onclick = () => setGizmoMode('rotate');
    if (applyBtn) applyBtn.onclick = () => applyFormValues();
    if (deleteBtn) deleteBtn.onclick = () => deleteSelectedCamera();
    
    if (modelTranslateBtn) modelTranslateBtn.onclick = () => setGizmoMode('translate');
    if (modelRotateBtn) modelRotateBtn.onclick = () => setGizmoMode('rotate');
    if (modelScaleBtn) modelScaleBtn.onclick = () => setGizmoMode('scale');
    if (applyModelBtn) applyModelBtn.onclick = () => applyModelFormValues();
    if (deleteModelBtn) deleteModelBtn.onclick = () => deleteSelectedModel();

    // Info popup handlers
    const infoIcon = document.getElementById('info-icon');
    const infoPopup = document.getElementById('info-popup');
    const closePopup = document.getElementById('close-popup');
    
    if (infoIcon) {
        infoIcon.onclick = () => {
            if (infoPopup) infoPopup.style.display = 'flex';
        };
    }
    
    if (closePopup) {
        closePopup.onclick = () => {
            if (infoPopup) infoPopup.style.display = 'none';
        };
    }
    
    if (infoPopup) {
        infoPopup.onclick = (e) => {
            if (e.target === infoPopup) {
                infoPopup.style.display = 'none';
            }
        };
    }

    console.log('UI initialized with GLB support and info popup!');
}

// === LOOP ===
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    renderer.render(scene, camera);
}

// === START APPLICATION ===
console.log('Starting application...');
animate();

// Initialize UI after a short delay to ensure DOM is ready
setTimeout(() => {
    initializeUI();
    console.log('Application ready!');
    console.log('Number of objects in scene:', scene.children.length);
}, 100);

// === USAGE INSTRUCTIONS ===
/*
How to use:
• Click "Upload GLB Model" to load a 3D model for visual reference
• Click "Import rig_config.json" to load existing camera configurations
• Click "Add Camera" to manually add new cameras
• Click on a camera (cone) to select it
• Click on a GLB model to select it
• T or button = Translation Mode (arrows)
• R or button = Rotation Mode (rings) 
• S or button = Scale Mode (cubes, GLB models only)
• Drag the gizmos to transform objects
• Click "Export rig_config.json" to save camera positions for COLMAP
• Models are loaded at origin (0,0,0) with original scale
• Models can be moved, rotated, and scaled (for visual reference only)
• Cameras can only be moved and rotated
• Import will replace all existing cameras with those from the JSON file
*/
