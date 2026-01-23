# Center model (OBJ)

Place your **OBJ** file at `center.obj` to replace the default center shape. The same glass/Fresnel shader, vocal-driven size/opacity/glow, smoke, Serum 1, and timeline animations apply.

- **Default:** `center.obj` is a simple octahedron; replace it with your model.
- **Custom path:** pass `{ centerModelUrl: '/models/your.obj' }` when creating `VisualizerEngine`.

The model is scaled to fit a unit sphere and centered. Only `position` and `normal` are used; OBJ materials/textures are ignored in favor of the built-in shader.
