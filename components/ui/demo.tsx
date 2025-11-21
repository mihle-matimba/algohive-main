import { Component } from '@/components/ui/radial-intro';

const ITEMS = [
  {
    id: 1,
    name: 'Aurora Hills',
    src: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 2,
    name: 'Desert Night',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 3,
    name: 'Mountain Lake',
    src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 4,
    name: 'City Sunrise',
    src: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 5,
    name: 'Forest Glow',
    src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 6,
    name: 'Ice Caves',
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 7,
    name: 'Canyon Light',
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 8,
    name: 'Harbor Evening',
    src: 'https://images.unsplash.com/photo-1429087969512-1e85aab2683d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 9,
    name: 'Northern Stars',
    src: 'https://images.unsplash.com/photo-1500530855697-7ad64b3f74a2?auto=format&fit=crop&w=400&q=80',
  },
];

export default function DemoOne() {
  return <Component orbitItems={ITEMS} />;
}

