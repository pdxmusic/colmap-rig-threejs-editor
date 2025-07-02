# colmap-rig-threejs-editor

A Three.js-based tool for visualizing and editing camera rigs, inspired by COLMAP. This editor allows you to manipulate cameras interactively using gizmos and a form-based interface.

## Features
- Add, delete, and manipulate cameras.
- Translation and rotation gizmos for precise adjustments.
- Export camera configurations to JSON.
- Interactive UI with real-time updates.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/colmap-rig-threejs-editor.git
   ```

2. Navigate to the project directory:
   ```bash
   cd colmap-rig-threejs-editor
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Use the tool:
   - **Add Camera**: Click the "Add Camera" button to add a new camera.
   - **Manipulate Camera**: Select a camera and use the gizmos (arrows for translation, rings for rotation) or the form to adjust its position and orientation.
   - **Export Configuration**: Click "Export Cameras" to save the current camera setup as a JSON file.

## Screenshot

![Screenshot](screenshot.png)

## License

This project is licensed under the MIT License. See the LICENSE file for details.
