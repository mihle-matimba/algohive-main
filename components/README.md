# Component directory

This repository is primarily static HTML today, so it does not have an established React component tree. To align with the provided SphereImageGrid component and make future React or shadcn/ui adoption straightforward, the `/components/ui` directory was created to house reusable UI pieces and their demo. Keeping UI code in this path mirrors the default shadcn convention and prevents scattering components across unrelated folders when the project grows.

Styles are currently defined within individual HTML pages via Tailwind CDN and inline blocks, so colocating future shared styles beside `/components/ui` or consolidating them under a `styles` folder will keep React assets from leaking into the legacy static pages.
