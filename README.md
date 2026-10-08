# Khubaib Shakeel · Portfolio

Interactive portfolio for a New York-based 3D artist. Static HTML, CSS and JavaScript; hosted with GitHub Pages.

The opening scene features Khubaib’s character, cursor eye tracking, five scroll-driven camera views, subtle zoom chromatic aberration, and interactive Sveston and AirPods models. Project panels include renders, video, and model exploration. Sound and music can be switched off using the lower-left controls.

Serve this directory with any static HTTP server. All media paths are relative so the site supports the /Portfolio/ GitHub Pages address.

The adapted reference stylesheet is MIT licensed; see LICENSE.reference. All portfolio text and personal media belong to Khubaib.

Performance: the desktop character uses a 2.31 MB / 131k-triangle export; small
devices use a 0.95 MB / 108k-triangle export. The watch is 0.29 MB / 53k triangles
and AirPods 0.69 MB / 43k triangles. Original source exports remain untouched.
Images use resized WebP versions. On phones/tablets, product previews load first
and interactive geometry loads on tap, then is released when closed. Character
rendering has a pixel budget, 30 fps on compact devices, and pauses during product
inspection, project panels, hidden tabs, and after the résumé. Desktop retains
zoom chromatic aberration; compact devices omit the extra postprocessing buffers.
