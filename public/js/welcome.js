const images = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1552051859-9076a0c4f0ae?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500336624523-d727130c3328?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500336624523-d727130c3328?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1552051859-9076a0c4f0ae?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500336624523-d727130c3328?auto=format&fit=crop&w=400&q=80"
];

const container = document.getElementById("image-sphere");
const total = images.length;
const layers = [0.45, 0.7, 0.95];
const baseRadius = Math.min(container.clientWidth, container.clientHeight) / 2.15;

images.forEach((src, index) => {
  const ring = layers[index % layers.length];
  const angle = (index / total) * Math.PI * 2;
  const radius = baseRadius * (ring + Math.random() * 0.08);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const size = 50 + Math.random() * 28;

  const wrapper = document.createElement("div");
  wrapper.className = "radial-node absolute rounded-full overflow-hidden bg-white border border-white/70";
  wrapper.style.width = `${size}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.left = `${container.clientWidth / 2 + x}px`;
  wrapper.style.top = `${container.clientHeight / 2 + y}px`;
  wrapper.style.transform = "translate(-50%, -50%)";

  const img = document.createElement("img");
  img.src = `${src}&auto=format&fit=crop&w=400&q=80`;
  img.alt = `Welcome image ${index + 1}`;
  img.className = "w-full h-full object-cover";
  img.loading = index < 5 ? "eager" : "lazy";

  wrapper.appendChild(img);
  container.appendChild(wrapper);
});
