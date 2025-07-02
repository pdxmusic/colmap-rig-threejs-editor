// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(4, 7, 2);
dirLight.castShadow = true;
scene.add(dirLight);

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

// === CAMERA SELECTION ===
function selectCamera(camera) {
    console.log('selectCamera called with:', camera);
    
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
    
    if (camera) {
        // Highlight selected camera
        camera.material.color.setHex(0xff6b35);
        
        // Show controls
        const controlsDiv = document.getElementById('camera-controls');
        if (controlsDiv) {
            controlsDiv.style.display = 'block';
            console.log('Control panel shown');
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

// === CUSTOM GIZMO ===
let gizmoGroup = null;
let isDragging = false;
let dragAxis = null;
let dragStart = new THREE.Vector3();
let cameraStart = new THREE.Vector3();
let rotationStart = new THREE.Euler();
let gizmoMode = 'translate'; // 'translate' or 'rotate'

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

// === GIZMO DRAG HANDLING ===
function handleGizmoDrag(event) {
    if (!isDragging || !dragAxis || !selectedCamera) return;

    // Calculate normalized mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (gizmoMode === 'translate') {
        handleTranslationDrag();
    } else if (gizmoMode === 'rotate') {
        handleRotationDrag(event);
    }
}

function handleTranslationDrag() {
    // Create a plane for dragging
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(direction, selectedCamera.position);

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

        selectedCamera.position.copy(newPosition);
        
        // Update gizmo position
        if (gizmoGroup) {
            gizmoGroup.position.copy(selectedCamera.position);
        }
        
        // Update form values
        updateFormValues();
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
    
    selectedCamera.rotation.copy(newRotation);
    
    // Update form values (quaternion)
    updateFormValues();
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
                
                // Save initial positions/rotations
                cameraStart.copy(selectedCamera.position);
                rotationStart.copy(selectedCamera.rotation);
                
                if (gizmoMode === 'translate') {
                    // Calculate starting point for dragging
                    const direction = new THREE.Vector3();
                    camera.getWorldDirection(direction);
                    const plane = new THREE.Plane();
                    plane.setFromNormalAndCoplanarPoint(direction, selectedCamera.position);
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

    // Check intersections with cameras
    const intersects = raycaster.intersectObjects(cameraObjects);

    if (intersects.length > 0) {
        const clickedCamera = intersects[0].object;
        if (clickedCamera.userData.isCamera) {
            selectCamera(clickedCamera);
            console.log('Camera selected!');
        }
    } else {
        // Clicked on empty space - deselect
        selectCamera(null);
        console.log('Selection removed');
    }
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
    if (!selectedCamera) return;
    
    switch(event.key.toLowerCase()) {
        case 't':
            setGizmoMode('translate');
            break;
        case 'r':
            setGizmoMode('rotate');
            break;
    }
}

function setGizmoMode(mode) {
    if (!selectedCamera) return;
    
    gizmoMode = mode;
    console.log('Mode changed to:', mode);
    
    // Recreate gizmo in new mode
    createGizmo(selectedCamera);
}

window.addEventListener('keydown', handleKeyPress);

// === EXPORT RIG_CONFIG.JSON ===
function exportCameras() {
    const cameraData = cameraObjects.map((cam, idx) => {
        cam.updateMatrixWorld(true);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        cam.getWorldPosition(pos);
        cam.getWorldQuaternion(quat);
        return {
            camera_id: idx + 1, // numbering from 1
            T_cam_rig: [Number(pos.x.toFixed(5)), Number(pos.y.toFixed(5)), Number(pos.z.toFixed(5))],
            Q_cam_rig: [Number(quat.w.toFixed(7)), Number(quat.x.toFixed(7)), Number(quat.y.toFixed(7)), Number(quat.z.toFixed(7))]
        };
    });
    const blob = new Blob([JSON.stringify({ rigs: [{ cameras: cameraData }] }, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "rig_config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// === UI INITIALIZATION ===
function initializeUI() {
    console.log('Initializing UI...');
    
    // Main controls
    const addBtn = document.getElementById('addCameraBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (addBtn) addBtn.textContent = 'Add Camera';
    if (exportBtn) exportBtn.textContent = 'Export Cameras';

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

    if (addBtn) addBtn.onclick = () => addCamera();
    if (exportBtn) exportBtn.onclick = () => exportCameras();
    if (translateBtn) translateBtn.onclick = () => setGizmoMode('translate');
    if (rotateBtn) rotateBtn.onclick = () => setGizmoMode('rotate');
    if (applyBtn) applyBtn.onclick = () => applyFormValues();
    if (deleteBtn) deleteBtn.onclick = () => deleteSelectedCamera();

    console.log('UI text translated to English!');
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
• Click on a camera to select it
• T or button = Translation Mode (arrows)
• R or button = Rotation Mode (rings)
• Drag the gizmos to move/rotate
*/
